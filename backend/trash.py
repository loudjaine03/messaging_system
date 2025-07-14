from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, Email, Email_User, URL, Attachment, db
from datetime import datetime, timedelta
import os

trash_bp = Blueprint('trash', __name__)
@trash_bp.route('/move-to-trash', methods=['POST'])
@jwt_required()
def move_to_trash():
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

    if email_user and email_user.folder != 'trash':
        email_user.original_folder = email_user.folder 
        email_user.folder = 'trash'
        email_user.trashed_at = datetime.utcnow()
        db.session.commit()
        return jsonify({"msg": "Email moved to trash successfully"}), 200
    elif email_user and email_user.folder == 'trash':
        return jsonify({"msg": "Email is already in trash"}), 200
    else:
        return jsonify({"msg": "Email not found"}), 404

@trash_bp.route('/restore-from-trash', methods=['POST'])
@jwt_required()
def restore_from_trash():
    data = request.get_json()
    email_id = data.get('emailId')
    current_username = get_jwt_identity()
    user = User.query.filter_by(username=current_username).first()

    if not email_id:
        return jsonify({"msg": "Email ID is required"}), 400
    if not user:
        return jsonify({"msg": "User not found"}), 404

    email_user = Email_User.query.filter_by(email_id=email_id, user_id=user.id_user, folder='trash').first()

    if email_user:
        original_folder = email_user.original_folder or 'inbox'
        email_user.folder = original_folder
        email_user.original_folder = None
        email_user.trashed_at = None
        db.session.commit()
        return jsonify({"msg": f"Email restored to {original_folder} successfully"}), 200
    else:
        return jsonify({"msg": "Email not found in trash for this user"}), 404

@trash_bp.route('/delete-permanently', methods=['DELETE'])
@jwt_required()
def delete_permanently():
    data = request.get_json()
    email_id = data.get('emailId')
    current_username = get_jwt_identity()
    user = User.query.filter_by(username=current_username).first()

    if not email_id:
        return jsonify({"msg": "Email ID is required"}), 400
    if not user:
        return jsonify({"msg": "User not found"}), 404

    email_user = Email_User.query.filter_by(email_id=email_id, user_id=user.id_user, folder='trash').first()
    if email_user:
        email = Email.query.get(email_id)
        if email:
            # Delete associated URLs
            URL.query.filter_by(email_id=email_id).delete()
            attachments = Attachment.query.filter_by(email_id=email_id).all()
            for attachment in attachments:
                if os.path.exists(attachment.file_path):
                    os.remove(attachment.file_path)
                db.session.delete(attachment)
            db.session.delete(email_user)
            if not Email_User.query.filter_by(email_id=email_id).first():
                db.session.delete(email)
            db.session.commit()
            return jsonify({"msg": "Email deleted permanently"}), 200
        else:
            return jsonify({"msg": "Email not found"}), 404
    else:
        return jsonify({"msg": "Email not found in trash for this user"}), 404
