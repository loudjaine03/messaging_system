
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from models import db, Email
from sqlalchemy import or_

search_bp = Blueprint("search", __name__)

@search_bp.route('/search_emails', methods=['GET'])
def search_emails():
    subject = request.args.get('subject', '').strip()
    sender = request.args.get('sender', '').strip()
    keyword = request.args.get('keyword', '').strip()
    date = request.args.get('date', '').strip()
    attachment_name = request.args.get('attachment', '').strip()

    query = Email.query

    if subject:
        query = query.filter(Email.subject.ilike(f"%{subject}%"))
    if sender:
        query = query.filter(Email.sender.ilike(f"%{sender}%"))
    if keyword:
        query = query.filter(Email.body.ilike(f"%{keyword}%"))
    if date:
        query = query.filter(db.func.date(Email.created_at) == date)

    results = query.order_by(Email.created_at.desc()).all()

    emails = []
    for email in results:
        attachments = [a.original_name for a in email.attachments]
        emails.append({
            "id": email.id_email,
            "subject": email.subject,
            "body": email.body,
            "created_at": email.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "sender": email.sender,
            "attachments": attachments
        })

    return jsonify(emails)
