from flask import Blueprint, jsonify, request, current_app, url_for, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from models import User, db
from flask_bcrypt import Bcrypt
import os
import re
from datetime import datetime

profile_bp = Blueprint("profile", __name__)
bcrypt = Bcrypt()

def allowed_file(filename):
    ext = filename.rsplit('.', 1)[-1].lower()
    return ext in current_app.config.get('ALLOWED_EXTENSIONS', set())

@profile_bp.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory('uploads', filename)

@profile_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    current_user = get_jwt_identity()
    user = User.query.filter_by(username=current_user).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    profile_picture_url = None
    if user.profile_picture:

        profile_picture_url = url_for('profile.uploaded_file', filename=user.profile_picture)

    return jsonify({
        "username": user.username,
        "firstName": user.firstname,
        "lastName": user.lastname,
        "birthday": user.birthday.strftime("%Y-%m-%d") if user.birthday else None,
        "phone": user.phonenumber,
        "position": user.job_title,
        "bio": user.bio,
        "profilePicturePath": profile_picture_url,
        "twoFAEnabled": user.two_fa_enabled,
        "backupPhone": user.phonenumber
    })

@profile_bp.route("/update-user", methods=["PUT"])
@jwt_required()
def update_user():
    current_user = get_jwt_identity()
    user = User.query.filter_by(username=current_user).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json() or {}
    user.firstname = data.get("firstName", user.firstname)
    user.lastname = data.get("lastName", user.lastname)
    user.job_title = data.get("job_title", user.job_title)
    user.bio = data.get("bio", user.bio)

    if data.get("birthday"):
        try:
            user.birthday = datetime.strptime(data["birthday"], "%Y-%m-%d")
        except ValueError:
            return jsonify({"error": "Invalid birthday format. Use YYYY-MM-DD."}), 400

    db.session.commit()
    return jsonify({"message": "User information updated successfully"}), 200

@profile_bp.route("/upload-profile-pic", methods=["POST"])
@jwt_required()
def upload_profile_pic():
    current_user = get_jwt_identity()
    user = User.query.filter_by(username=current_user).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        _, ext = os.path.splitext(file.filename)
        filename = secure_filename(f"{user.id_user}_{int(datetime.now().timestamp())}{ext}")

        upload_folder = os.path.join('uploads', 'profilepics')
        os.makedirs(upload_folder, exist_ok=True)
        filepath = os.path.join(upload_folder, filename)

        file.save(filepath)

        relative_path = os.path.join('profilepics', filename)
        user.profile_picture = relative_path
        db.session.commit()


        new_url = url_for('profile.uploaded_file', filename=relative_path)
        return jsonify({
            "message": "Profile picture updated successfully", 
            "profilePicturePath": new_url
        }), 200

    return jsonify({"error": "Invalid file type"}), 400

@profile_bp.route("/update-password", methods=["PUT"])
@jwt_required()
def update_password():
    current_user = get_jwt_identity()
    user = User.query.filter_by(username=current_user).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json() or {}
    old_password = data.get("oldPassword")
    new_password = data.get("newPassword")

    if not bcrypt.check_password_hash(user.password, old_password):
        return jsonify({"error": "Old password is incorrect"}), 403

    if (len(new_password) < 12 or
            not re.search(r"[A-Z]", new_password) or
            not re.search(r"[a-z]", new_password) or
            not re.search(r"[0-9]", new_password) or
            not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]", new_password)):
        return jsonify({
            "error": "New password must be at least 12 characters long and contain uppercase, lowercase, numbers, and symbols."
        }), 400

    user.password = bcrypt.generate_password_hash(new_password).decode('utf-8')
    db.session.commit()
    return jsonify({"message": "Password updated successfully"}), 200

@profile_bp.route("/confirm-phone-change", methods=["POST"])
@jwt_required()
def confirm_phone_change():
    current_user = get_jwt_identity()
    user = User.query.filter_by(username=current_user).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()
    phone = data.get("phone")
    password = data.get("password")

    if not bcrypt.check_password_hash(user.password, password):
        return jsonify({"error": "Incorrect password"}), 403

    user.phonenumber = phone
    db.session.commit()
    return jsonify({"message": "Phone updated successfully"}), 200

@profile_bp.route("/update-backup", methods=["PUT"])
@jwt_required()
def update_backup():
    current_user = get_jwt_identity()
    user = User.query.filter_by(username=current_user).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()
    phonenumber = data.get("backupPhone")
    enable_2fa = data.get("twoFAEnabled")

    if phonenumber:
        user.phonenumber = phonenumber
    if enable_2fa is not None:
        if enable_2fa and not user.phonenumber:
            return jsonify({"error": "Backup phone required for 2FA"}), 400
        user.two_fa_enabled = enable_2fa

    db.session.commit()
    return jsonify({
        "message": "Backup information updated successfully",
        "twoFAEnabled": user.two_fa_enabled
    }), 200
