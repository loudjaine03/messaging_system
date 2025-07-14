from flask import Blueprint, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, Email, Email_User, Attachment, URL, db
import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()
EMAIL_ENCRYPTION_KEY = os.getenv("EMAIL_ENCRYPTION_KEY")
fernet = Fernet(EMAIL_ENCRYPTION_KEY.encode())


receive_bp = Blueprint('receive', __name__)

@receive_bp.route('/get-emails', methods=['GET'])
@jwt_required()
def get_emails():
    current_username = get_jwt_identity()
    user = User.query.filter_by(username=current_username).first()

    if not user:
        return jsonify({"msg": "User not found"}), 404

    user_id = user.id_user
    print(f"[DEBUG] Fetching emails for {user.username} (ID: {user_id})")

    emails_data = []
    email_users = Email_User.query.filter_by(user_id=user_id).all()

    print(f"[DEBUG] Found {len(email_users)} emails in Email_User for user {user.username}")

    for email_user in email_users:
        email = db.session.get(Email, email_user.email_id)
        if not email:
            continue

        sender = db.session.get(User, email.sender_id)
        recipient_users = [
            eu.user.username for eu in Email_User.query.filter_by(email_id=email.id_email, role='receiver').all()
        ]

  
        urls_data = []

        associated_urls = URL.query.filter_by(email_id=email.id_email).all()
        for url_obj in associated_urls:
            urls_data.append({
                'url': url_obj.data,
                'danger_level': url_obj.danger_level
            })


        attachments_data = []
        for att in email.attachments:
            attachments_data.append({
                'id': att.id_piece,
                'filename': att.original_name,
                'name': att.original_name,
                'danger_level': att.danger_level
            })

        print(f"[DEBUG] Email ID: {email.id_email}, Folder: {email_user.folder}, Role: {email_user.role}")
        try:
            decrypted_body = fernet.decrypt(email.body.encode()).decode()
        except Exception:
            decrypted_body = "[UNREADABLE: decryption failed]"
        
        emails_data.append({
            'id': email.id_email,
            'sender': sender.username if sender else None,
            'receiver': ', '.join(recipient_users),
            'subject': email.subject,
            'message': decrypted_body,
            'time': email.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'folder': email_user.folder,
            'is_read': email_user.is_read,
            'isFavourite': email_user.is_favourite,
            'attachments': attachments_data,
            'urls': urls_data 
        })

    return jsonify(user=user.username, emails=emails_data), 200

@receive_bp.route('/download-attachment/<int:attachment_id>', methods=['GET'])
@jwt_required()
def download_attachment(attachment_id):
    attachment = db.session.get(Attachment, attachment_id)
    if not attachment:
        return jsonify({"msg": "Attachment not found"}), 404

    file_path = attachment.file_path
    original_name = attachment.original_name

    if not os.path.exists(file_path):
        return jsonify({"msg": "Attachment file not found on server"}), 500

    return send_file(
        file_path,
        as_attachment=True,
        download_name=original_name
    )
