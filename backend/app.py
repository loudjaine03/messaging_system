from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
import configuration 
from models import db, User
from signin import signin_bp
from signup import signup_bp
from userprofile import profile_bp
from send import send_bp
from receive import receive_bp
from downloadfiles import download_bp
from trash import trash_bp
from favourite import favourite_bp
from consultmembers import get_users_bp
from search import search_bp
from recoverpass import recover_bp
import os

def create_app():
    app = Flask(__name__)
    CORS(app)

    # Load Configuration from configuration.py
    app.config.from_object(configuration)

    # 1. Define the path for uploads
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads', 'profilepics')
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
    # 2. Define allowed extensions
    app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif'}
    # 3. Create the folder if it doesn't exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Initialize SQLAlchemy with the app
    db.init_app(app) 

    # Initialize JWT
    jwt = JWTManager(app) 

    # Register Blueprints
    app.register_blueprint(send_bp)
    app.register_blueprint(receive_bp)
    app.register_blueprint(signin_bp)
    app.register_blueprint(signup_bp)
    app.register_blueprint(profile_bp) 
    app.register_blueprint(download_bp)
    app.register_blueprint(trash_bp)
    app.register_blueprint(favourite_bp)
    app.register_blueprint(get_users_bp)
    app.register_blueprint(search_bp)
    app.register_blueprint(recover_bp)

    return app

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()
    app.run(debug=True)