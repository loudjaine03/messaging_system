from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from models import User, db

get_users_bp = Blueprint("get_users", __name__)

@get_users_bp.route('/get-all-users', methods=['GET'])
@jwt_required()
def get_all_users():
    try:
        users = User.query.with_entities(
            User.id_user,
            User.username,
            User.firstname,
            User.lastname,
            User.job_title,
            User.bio,
            User.profile_picture
        ).all()

        user_list = []
        for user in users:
            user_dict = {
                "id_user": user.id_user,
                "username": user.username,
                "firstname": user.firstname,
                "lastname": user.lastname,
                "job_title": user.job_title,
                "bio": user.bio,
                "profile_picture": (
                    f"http://localhost:5000/uploads/{user.profile_picture}"
                    if user.profile_picture and not user.profile_picture.startswith("http")
                    else user.profile_picture
                )
            }
            user_list.append(user_dict)

        return jsonify({'users': user_list})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
