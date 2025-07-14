from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, Email, Email_User, db
from datetime import datetime

favourite_bp = Blueprint('favourite', __name__)

@favourite_bp.route('/toggle-favourite', methods=['POST'])
@jwt_required()
def toggle_favourite():
    data = request.get_json()
    email_id = data.get('emailId')
    current_username = get_jwt_identity()
    user = User.query.filter_by(username=current_username).first()

    if not email_id:
        return jsonify({"msg": "Email ID is required"}), 400
    if not user:
        return jsonify({"msg": "User not found"}), 404

    email_user = Email_User.query.filter_by(
        email_id=email_id,
        user_id=user.id_user
    ).first()

    if not email_user:
        return jsonify({"msg": "Email not found for this user"}), 404

    # Toggle the favorite status
    email_user.is_favourite = not email_user.is_favourite
    db.session.commit()

    return jsonify({
        "msg": "Favorite status updated",
        "isFavourite": email_user.is_favourite,
        "folder": email_user.folder  # Return current folder
    }), 200

@favourite_bp.route('/get-favourites', methods=['GET'])
@jwt_required()
def get_favourites():
    current_username = get_jwt_identity()
    user = User.query.filter_by(username=current_username).first()

    if not user:
        return jsonify({"msg": "User not found"}), 404

    # Get all email_user relationships that are favorited
    favourites = db.session.query(Email, Email_User).join(
        Email_User,
        Email_User.email_id == Email.id_email
    ).filter(
        Email_User.user_id == user.id_user,
        Email_User.is_favourite == True
    ).all()

    result = []
    for email, email_user in favourites:
        result.append({
            'id': email.id_email,
            'subject': email.subject,
            'message': email.message,
            'sender': email.sender,
            'receiver': email.receiver,
            'time': email.time.isoformat(),
            'folder': email_user.folder,
            'isFavourite': email_user.is_favourite,
            'attachments': [{'id': a.id_attachment, 'name': a.filename} for a in email.attachments]
        })

    return jsonify(result), 200