from flask import Flask, request, jsonify
from twilio.rest import Client
from datetime import datetime, timedelta
from models import db,OTP, User 
import random
import os
app = Flask(__name__)
from dotenv import load_dotenv

load_dotenv()

# Twilio config
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

@app.route('/send-otp', methods=['POST'])
def send_otp():
    data = request.get_json()
    phone_number = data.get('phone')

    if not phone_number:
        return jsonify({'error': 'Phone number is required'}), 400

    # Find the user
    user = User.query.filter_by(phonenumber=phone_number).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Check if 2FA is enabled
    if not user.two_fa_enabled:
        return jsonify({'error': '2FA is not enabled for this user'}), 403

    otp_code = str(random.randint(100000, 999999))
    expiry_time = datetime.utcnow() + timedelta(minutes=5)

    # Save OTP to DB
    otp_entry = OTP(code=otp_code, expiry_time=expiry_time, id_user=user.id)
    db.session.add(otp_entry)
    db.session.commit()

    try:
        client.messages.create(
            body=f'Your verification code is {otp_code}',
            from_=TWILIO_PHONE_NUMBER,
            to=phone_number
        )
        return jsonify({'message': 'OTP sent successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

  
@app.route('/verify-otp', methods=['POST'])
def verify_otp():
    data = request.get_json()
    phone = data.get('phone')
    code = data.get('otp')

    if not phone or not code:
        return jsonify({'error': 'Phone and OTP are required'}), 400

    # Find the user by phone number
    user = User.query.filter_by(phonenumber=phone).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Get the latest OTP for this user
    otp_record = OTP.query.filter_by(id_user=user.id, code=code).order_by(OTP.expiry_time.desc()).first()

    if not otp_record:
        return jsonify({'error': 'Invalid OTP'}), 400

    if datetime.utcnow() > otp_record.expiry_time:
        return jsonify({'error': 'OTP has expired'}), 400

    # Delete the OTP after successful verification
    db.session.delete(otp_record)
    db.session.commit()

    return jsonify({'message': 'OTP verified successfully'}), 200