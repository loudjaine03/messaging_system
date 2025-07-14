import bcrypt
import re
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from sqlalchemy import func
from models import db, User, CeristEmail, OTP
import random
import os
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

signup_bp = Blueprint("signup", __name__)

# Twilio Configuration
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")

TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN") 

TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")


# Initialize Twilio Client
if not all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER]):
    print("WARNING: Twilio credentials not found in environment variables.")
    twilio_client = None
else:
    twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

def validate_cerist_email(prefix):
    full_email = f"{prefix}@cerist.dz".lower()
    cerist_email = CeristEmail.query.filter(func.lower(CeristEmail.email) == full_email).first()
    if not cerist_email:
        return None, "CERIST ID not found in our system"
    return prefix, None

def send_otp_via_twilio(phone_number, user_id):
    """Reusable function to send OTP (similar to forget password)"""
    if not twilio_client:
        return False, "Twilio service is not configured"
    
    otp_code = str(random.randint(100000, 999999))
    expiry_time = datetime.utcnow() + timedelta(minutes=5)

    otp_entry = OTP(code=otp_code, expiry_time=expiry_time, id_user=user_id)
    db.session.add(otp_entry)
    db.session.commit()

    try:
        message_body = f'Your verification code is {otp_code}'
        twilio_client.messages.create(
            body=message_body,
            from_=TWILIO_PHONE_NUMBER,
            to=phone_number
        )
        return True, "OTP sent successfully"
    except Exception as e:
        return False, str(e)

@signup_bp.route("/check-availability", methods=["POST"])
@cross_origin()
def check_availability():
    data = request.get_json()
    prefix = data.get("username", "").strip().lower()
    
    _, error = validate_cerist_email(prefix)
    if error:
        return jsonify({"exists": True, "error": error}), 400

    existing_user = User.query.filter_by(username=prefix, activated=True).first()
    return jsonify({"exists": existing_user is not None})

@signup_bp.route("/signup", methods=["POST"])
@cross_origin()
def signup():
    data = request.json
    required_fields = ["username", "firstname", "lastname", "gender", "password"]

    if not all(data.get(field) for field in required_fields):
        return jsonify({"error": "Please fill in all required fields"}), 400

    username_input = data["username"].strip().lower()
    email_prefix = username_input.split('@')[0]
    full_email = f"{email_prefix}@cerist.dz".lower()

    cerist_email = CeristEmail.query.filter(func.lower(CeristEmail.email) == full_email).first()
    if not cerist_email:
        return jsonify({"error": "Email not found in CERIST directory"}), 400

    existing_user = User.query.filter(
        (func.lower(User.username) == full_email) | (func.lower(User.username) == email_prefix)
    ).first()

    if existing_user:
        if existing_user.activated:
            return jsonify({"error": "Account already exists and is validated"}), 400
        else:
            db.session.delete(existing_user)
            db.session.commit()

    password = data["password"]
    if (len(password) < 12 or
        not re.search(r'[A-Z]', password) or
        not re.search(r'[a-z]', password) or
        not re.search(r'\d', password)):
        return jsonify({"error": "Password must be at least 12 characters long, contain uppercase, lowercase, and a number"}), 400

    hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    new_user = User(
        username=email_prefix,
        firstname=data["firstname"].strip(),
        lastname=data["lastname"].strip(),
        gender=data["gender"].strip(),
        birthday=data.get("birthday"),
        password=hashed_pw,
        activated=False,
        phonenumber=cerist_email.phone
    )

    db.session.add(new_user)
    db.session.commit()

    # Send OTP 
    if not new_user.phonenumber:
        return jsonify({"error": "No phone number associated with this account"}), 400

    success, message = send_otp_via_twilio(new_user.phonenumber, new_user.id_user)
    if not success:
        return jsonify({"error": f"Failed to send OTP: {message}"}), 500

    masked_phone = '*' * (len(new_user.phonenumber) - 4) + new_user.phonenumber[-4:]

    return jsonify({
        "message": "Signup successful. Verification code sent.",
        "masked_phone": masked_phone
    }), 200

@signup_bp.route("/verify-signup-otp", methods=["POST"])
@cross_origin()
def verify_signup_otp():
    data = request.json
    username = data.get("username", "").strip().lower()
    code = data.get("code")

    if not username or not code:
        return jsonify({"error": "Username and OTP code are required"}), 400

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    otp_record = OTP.query.filter(
        OTP.id_user == user.id_user,
        OTP.code == code,
        OTP.expiry_time > datetime.utcnow()
    ).order_by(OTP.id_code.desc()).first()

    if not otp_record:
        return jsonify({"error": "Invalid or expired OTP"}), 400

    # Activate the user
    user.activated = True
    db.session.delete(otp_record)
    db.session.commit()

    return jsonify({"message": "Account verified successfully"}), 200


@signup_bp.route("/resend-signup-otp", methods=["POST"])
@cross_origin()
def resend_signup_otp():
    data = request.json
    username = data.get("username", "").strip().lower()

    user = User.query.filter_by(username=username, activated=False).first()
    if not user:
        return jsonify({"error": "No inactive account found for this user"}), 404

    if not user.phonenumber:
        return jsonify({"error": "No phone number associated with this account"}), 400

    success, message = send_otp_via_twilio(user.phonenumber, user.id_user)
    if not success:
        return jsonify({"error": f"Failed to resend OTP: {message}"}), 500

    masked_phone = '*' * (len(user.phonenumber) - 4) + user.phonenumber[-4:]

    return jsonify({
        "message": "New OTP sent successfully",
        "masked_phone": masked_phone
    }), 200
