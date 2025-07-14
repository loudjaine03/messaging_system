from flask import Blueprint, request, jsonify
from models import User, db, OTP
from datetime import datetime, timedelta
from twilio.rest import Client
from dotenv import load_dotenv
import re
import os
import random
import bcrypt

load_dotenv()

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

if not all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER]):
    print("WARNING: Twilio credentials not found in environment variables.")
    twilio_client = None
else:
    twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

recover_bp = Blueprint('recover', __name__)


@recover_bp.route('/recover-password', methods=['POST'])
def recover_and_send_otp():
    if not twilio_client:
        return jsonify({'error': 'Twilio service is not configured on the server.'}), 500

    data = request.get_json()
    username = data.get('username')

    if not username:
        return jsonify({'error': 'Username is required'}), 400

    user = User.query.filter_by(username=username).first()
    if not user or not user.phonenumber:
        return jsonify({'error': 'If an account with that username exists, a code has been sent.'}), 200

    phone = user.phonenumber.strip()
    if not re.match(r'^\+?[1-9]\d{1,14}$', phone):
        return jsonify({'error': 'Invalid phone number format associated with the user.'}), 400

    otp_code = str(random.randint(100000, 999999))
    expiry_time = datetime.utcnow() + timedelta(minutes=5)

    otp_entry = OTP(code=otp_code, expiry_time=expiry_time, id_user=user.id_user)
    db.session.add(otp_entry)
    db.session.commit()

    try:
        twilio_client.messages.create(
            body=f'Your verification code is {otp_code}',
            from_=TWILIO_PHONE_NUMBER,
            to=phone
        )
    except Exception:
        return jsonify({'error': 'Failed to send verification code.'}), 500

    masked_phone = '*' * (len(phone) - 4) + phone[-4:]
    return jsonify({'message': 'OTP sent successfully', 'maskedPhone': masked_phone}), 200


@recover_bp.route('/reset-with-otp', methods=['POST'])
def reset_with_otp():
    data = request.get_json()
    username = data.get('username')
    code = data.get('otp')
    new_password = data.get('new_password')

    if not all([username, code, new_password]):
        return jsonify({'error': 'Username, OTP, and new password are required'}), 400

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'Invalid request'}), 404

    otp_record = OTP.query.filter(
        OTP.id_user == user.id_user,
        OTP.code == code,
        OTP.expiry_time > datetime.utcnow()
    ).order_by(OTP.id_code.desc()).first()

    if not otp_record:
        return jsonify({'error': 'Invalid or expired OTP'}), 400

    hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
    user.password = hashed_password.decode('utf-8')

    otp_record.expiry_time = datetime.utcnow()
    db.session.commit()

    return jsonify({'message': 'Password reset successfully'}), 200
