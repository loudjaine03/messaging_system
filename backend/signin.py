from flask import Blueprint, request, jsonify, session
from models import User, db
from flask_jwt_extended import create_access_token
from flask_cors import cross_origin
from flask_wtf import FlaskForm, RecaptchaField
from wtforms import StringField, PasswordField
from wtforms.validators import DataRequired
import bcrypt
from datetime import datetime, timedelta
import random
from twilio.rest import Client
import os
from dotenv import load_dotenv

load_dotenv()


signin_bp = Blueprint("signin", __name__)

# Twilio config
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")
client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)


class LoginForm(FlaskForm):
    username = StringField('username', validators=[DataRequired()])
    password = PasswordField('password', validators=[DataRequired()])
    recaptcha = RecaptchaField()


otp_store = {} 

@signin_bp.route("/signin", methods=["POST"])
@cross_origin(supports_credentials=True)
def signin():
    try:
        data = request.get_json()
        print("Received request:", data)  

        if not data:
            return jsonify({"error": "Invalid request"}), 400

        username = data.get("username")
        password = data.get("password")
        otp = data.get("otp") 
        user_id = data.get("user_id") 


        if otp and user_id:
            otp_data = otp_store.get(user_id)
            if otp_data:
                if otp_data["code"] == otp and otp_data["expires_at"] > datetime.utcnow():

                    del otp_store[user_id]
                    user = User.query.get(user_id)
                    if not user.activated:
                     user.activated = True
                    db.session.commit()
                    access_token = create_access_token(identity=user.username)
                    return jsonify({"message": "OTP verified", "token": access_token}), 200
                else:
                    return jsonify({"error": "Invalid or expired OTP"}), 400
            else:
                return jsonify({"error": "No OTP requested for this user"}), 400


        if 'failed_attempts' not in session:
            session['failed_attempts'] = 0

        require_captcha = session['failed_attempts'] >= 2

        form = LoginForm(data=data)

        if require_captcha:
            if not form.validate():
                print("Captcha validation failed or required")
                return jsonify({"error": "Captcha validation failed or required"}), 400
        else:
            form.recaptcha.flags.required = False

        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400

        user = User.query.filter_by(username=username).first()
        if not user:
            session['failed_attempts'] += 1
            return jsonify({"error": "Invalid username or password"}), 401

        if not bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8')):
            session['failed_attempts'] += 1
            return jsonify({"error": "Invalid username or password"}), 401

        if not user.activated:
            code = str(random.randint(100000, 999999))
            expires_at = datetime.utcnow() + timedelta(minutes=5)
            otp_store[user.id_user] = {"code": code, "expires_at": expires_at}

            try:
                client.messages.create(
                    body=f"Your account verification code is {code}",
                    from_=TWILIO_PHONE_NUMBER,
                    to=user.phonenumber
                )
                return jsonify({
                    "message": "Account not activated. Verification code resent.",
                    "require_activation": True,
                    "user_id": user.id_user,
                    "phonenumber": '*' * (len(user.phonenumber) - 4) + user.phonenumber[-4:]
                }), 403
            except Exception as e:
                return jsonify({"error": f"Failed to send OTP: {str(e)}"}), 500


        session['failed_attempts'] = 0


        if user.two_fa_enabled:
            code = str(random.randint(100000, 999999))
            expires_at = datetime.utcnow() + timedelta(minutes=5)
            otp_store[user.id_user] = {"code": code, "expires_at": expires_at}

            client.messages.create(
                body=f"Your verification code is {code}",
                from_=TWILIO_PHONE_NUMBER,
                to=user.phonenumber
            )

            return jsonify({"message": "OTP sent", "require_otp": True, "user_id": user.id_user}), 200


        access_token = create_access_token(identity=user.username)
        return jsonify({"message": "Login successful", "token": access_token}), 200

    except Exception as e:
        print(f"Error during login: {str(e)}")  
        return jsonify({"error": "Internal server error"}), 500

@signin_bp.route("/logout", methods=["GET"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out"}), 200
