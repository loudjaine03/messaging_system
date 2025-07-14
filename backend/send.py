from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from models import User, Email, Email_User, URL, Attachment, db
import os
import re
import requests
import time
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

EMAIL_ENCRYPTION_KEY = os.getenv("EMAIL_ENCRYPTION_KEY")
fernet = Fernet(EMAIL_ENCRYPTION_KEY.encode())


HYBRID_API_KEY = os.getenv("HYBRID_API_KEY")
send_bp = Blueprint('send', __name__)
UPLOAD_FOLDER = 'Uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def scan_resource_with_hybrid(resource, resource_type='file'):
    """Scan either a file or URL using Hybrid Analysis API"""
    headers = {
        'api-key': HYBRID_API_KEY,
        'User-Agent': 'Falcon Sandbox',
        'accept': 'application/json'
    }

    try:
        if resource_type == 'file':
            # File scanning logic
            submit_url = "https://www.hybrid-analysis.com/api/v2/quick-scan/file"
            files = {'file': (resource[1], resource[0])}
            data = {'scan_type': 'all', 'no_share_third_party': 'true'}
            response = requests.post(submit_url, headers=headers, files=files, data=data, timeout=60)
        else:
            # URL scanning logic
            submit_url = "https://www.hybrid-analysis.com/api/v2/quick-scan/url"
            data = {'url': resource, 'scan_type': 'all', 'no_share_third_party': 'true'}
            response = requests.post(submit_url, headers=headers, data=data, timeout=60)

        if response.status_code != 200:
            print(f"[ERROR] {resource_type} scan submission failed: {response.status_code} - {response.text}")
            return None

        scan_data = response.json()
        scan_id = scan_data.get('id')
        if not scan_id:
            print(f"[ERROR] No scan ID returned for {resource_type}")
            return None

        # Poll scan results
        status_url = f"https://www.hybrid-analysis.com/api/v2/quick-scan/{scan_id}"
        max_attempts, poll_interval = 15, 20

        for attempt in range(1, max_attempts + 1):
            print(f"[STATUS] {resource_type} check {attempt}/{max_attempts}...")
            time.sleep(poll_interval)

            status_response = requests.get(status_url, headers=headers, timeout=30)
            if status_response.status_code != 200:
                print(f"[WARN] Status check failed: {status_response.status_code}")
                continue

            result = status_response.json()
            if result.get('finished'):
                print(f"[SUCCESS] {resource_type.capitalize()} scan finished")
                return result

            print(f"[STATUS] Progress: {result.get('progress', 0)}%")

        print(f"[ERROR] {resource_type.capitalize()} scan timeout")
        return None

    except requests.RequestException as e:
        print(f"[ERROR] {resource_type} scan request failed: {e}")
        return None

def determine_danger_level(scan_result):
    """Determine the most dangerous status reported by any scanner."""
    if not scan_result:
        return 'pending'

    # File-specific: Check threats
    threats = scan_result.get('threats', [])
    av_matches = scan_result.get('av_matches', [])
    if any(t.get('severity', 0) >= 4 for t in threats):
        return 'malicious'
    if av_matches or threats:
        return 'suspicious'

    # Generic: Check scanners_v2 
    scanners = scan_result.get('scanners_v2', {})
    malicious_detected = False
    suspicious_detected = False

    for scanner_name, scanner_data in scanners.items():
        if not scanner_data:
            continue
        status = scanner_data.get('status', '').lower()
        if status == 'malicious':
            malicious_detected = True
        elif status == 'suspicious':
            suspicious_detected = True

    if malicious_detected:
        return 'malicious'
    if suspicious_detected:
        return 'suspicious'

    return 'safe'


@send_bp.route('/send-email', methods=['POST'])
@jwt_required()
def send_email():
    current_username = get_jwt_identity()
    sender = User.query.filter_by(username=current_username).first()

    if not sender:
        return jsonify({"error": "Sender not found"}), 404

    # Parse data
    recipient_usernames = [u.strip() for u in request.form.get('to', '').split(',')]
    subject = request.form.get('subject', 'No Subject')
    body = request.form.get('message', '')
    attachment_file = request.files.get('attachment')
    plain_body = request.form.get('message', '')
    encrypted_body = fernet.encrypt(plain_body.encode()).decode()

    # Validate recipients
    valid_recipients = []
    for username in recipient_usernames:
        user = User.query.filter_by(username=username).first()
        if user:
            valid_recipients.append(user)
        else:
            print(f"[WARNING] Recipient not found: {username}")

    if not valid_recipients:
        return jsonify({"msg": "No valid recipients found"}), 400

    # Create email
    new_email = Email(sender_id=sender.id_user, subject=subject, body=encrypted_body)
    db.session.add(new_email)
    db.session.flush()

    # Scan and process URLs from body
    url_pattern = re.findall(r'(https?://\S+|www\.\S+)', body)
    for url in url_pattern:
        scan_result = scan_resource_with_hybrid(url, 'url')
        print(f"[SCAN RESULT - URL] {url} => {scan_result}") 
        danger_level = determine_danger_level(scan_result)
        
        db.session.add(URL(
            data=url,
            danger_level=danger_level,
            email_id=new_email.id_email
        ))

    # Handle attachment
    if attachment_file and attachment_file.filename:
        original_name = secure_filename(attachment_file.filename)
        file_ext = original_name.rsplit('.', 1)[-1] if '.' in original_name else ''
        save_name = f"{new_email.id_email}_{sender.id_user}.{file_ext}"
        save_path = os.path.join(UPLOAD_FOLDER, save_name)

        # Scan file
        attachment_file.stream.seek(0)
        scan_result = scan_resource_with_hybrid(
            (attachment_file.stream, original_name), 
            'file'
        )
        print(f"[SCAN RESULT - FILE] {original_name} => {scan_result}")

        # Save file locally
        attachment_file.stream.seek(0)
        attachment_file.save(save_path)

        # Determine danger level
        danger_level = determine_danger_level(scan_result)

        # Store in DB
        db.session.add(Attachment(
            email_id=new_email.id_email,
            file_path=save_path,
            original_name=original_name,
            danger_level=danger_level
        ))

    # Email associations
    db.session.add(Email_User(
        email_id=new_email.id_email,
        user_id=sender.id_user,
        folder='sent',
        role='sender'
    ))
    for recipient in valid_recipients:
        db.session.add(Email_User(
            email_id=new_email.id_email,
            user_id=recipient.id_user,
            folder='inbox',
            role='receiver'
        ))

    try:
        db.session.commit()
        return jsonify({
            "msg": "Email sent successfully",
            "email_id": new_email.id_email
        }), 200
    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] Commit failed: {e}")
        return jsonify({"msg": "Failed to send email"}), 500