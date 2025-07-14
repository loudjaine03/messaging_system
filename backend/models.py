from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from datetime import datetime

db = SQLAlchemy()
bcrypt = Bcrypt()

# ----------------------------
# User Model
# ----------------------------
class User(db.Model):
    __tablename__ = 'user'

    id_user = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    firstname = db.Column(db.String(50), nullable=False)
    lastname = db.Column(db.String(50), nullable=True)
    gender = db.Column(db.String(10), nullable=False)
    phonenumber = db.Column(db.String(20), unique=True, nullable=True)
    birthday = db.Column(db.Date, nullable=False)
    profile_picture = db.Column(db.String(255), nullable=True)
    password = db.Column(db.String(200), nullable=False)
    bio = db.Column(db.String(255), nullable=True)
    job_title = db.Column(db.String(100), nullable=True)
    activated = db.Column(db.Boolean, default=False, nullable=False) 
    two_fa_enabled = db.Column(db.Boolean, default=False, nullable=False)

    # Relationships
    sent_emails = db.relationship('Email', backref='sender', foreign_keys='Email.sender_id')
    email_users = db.relationship('Email_User', backref='user', cascade="all, delete-orphan")
    otp_codes = db.relationship('OTP', backref='user', cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.username}>"

# ----------------------------
# Email Model
# ----------------------------
class Email(db.Model):
    __tablename__ = 'email'

    id_email = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id_user'), nullable=True)
    subject = db.Column(db.String(255), nullable=True)
    body = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    email_users = db.relationship('Email_User', backref='email', cascade="all, delete-orphan")
    attachments = db.relationship('Attachment', back_populates='email', cascade="all, delete-orphan")



    urls = db.relationship('URL', backref='email', cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Email {self.id_email}>"

# ----------------------------
# EmailUser Association Model
# ----------------------------
class Email_User(db.Model):
    __tablename__ = 'email_user'

    id_email_user = db.Column(db.Integer, primary_key=True)
    email_id = db.Column(db.Integer, db.ForeignKey('email.id_email'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id_user'), nullable=False)
    folder = db.Column(db.Enum('inbox', 'sent', 'trash', 'favourite'), default='inbox', nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    deleted_at = db.Column(db.DateTime, nullable=True)
    role = db.Column(db.String(20), nullable=False)  # 'sender' or 'receiver'
    original_folder = db.Column(db.String(20), nullable=True)
    is_favourite = db.Column(db.Boolean, default=False)


    def __repr__(self):
        return f"<EmailUser email_id={self.email_id} user_id={self.user_id} folder={self.folder}>"


# ----------------------------
# Attachment Model
# ----------------------------
class Attachment(db.Model):
    __tablename__ = 'attachment'

    id_piece = db.Column(db.Integer, primary_key=True)
    file_path = db.Column(db.String(255), nullable=False) 
    original_name = db.Column(db.String(255), nullable=False)
    danger_level = db.Column(db.String(20), nullable=False)
    email_id = db.Column(db.Integer, db.ForeignKey('email.id_email'), nullable=False)

    email = db.relationship('Email', back_populates='attachments')

    def __repr__(self):
        return f"<Attachment {self.id_piece} original_name={self.original_name} danger={self.danger_level}>"


# ----------------------------
# URL Model
# ----------------------------
class URL(db.Model):
    __tablename__ = 'url'

    id_url = db.Column(db.Integer, primary_key=True)
    data = db.Column(db.Text, nullable=False)
    danger_level = db.Column(db.String(20), nullable=False)
    email_id = db.Column(db.Integer, db.ForeignKey('email.id_email'), nullable=False)

    def __repr__(self):
        return f"<URL {self.id_url} danger={self.danger_level}>"

# ----------------------------
# OTP Model
# ----------------------------
class OTP(db.Model):
    __tablename__ = 'otp'

    id_code = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(10), nullable=False)
    expiry_time = db.Column(db.DateTime, nullable=False)
    id_user = db.Column(db.Integer, db.ForeignKey('user.id_user'), nullable=False)

    def __repr__(self):
        return f"<OTP {self.code} for user {self.id_user}>"
    

class CeristEmail(db.Model):
    __tablename__ = 'cerist_emails'

    email = db.Column(db.String(255), primary_key=True, unique=True, nullable=False)
    phone = db.Column(db.String(20), unique=True, nullable=False)

    __table_args__ = (
        db.CheckConstraint("email LIKE '%@cerist.dz'", name='email_domain_check'),
    )

