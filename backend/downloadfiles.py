from flask import Blueprint, send_from_directory, current_app
from models import Attachment
import os

download_bp = Blueprint('download', __name__)

@download_bp.route('/download/<attachment_id>', methods=['GET'])
def download_attachment(attachment_id):
    attachment = Attachment.query.get(attachment_id)

    if not attachment:
        return "Attachment not found", 404

    return send_from_directory(
        current_app.config['UPLOAD_FOLDER'], 
        attachment.filename,
        as_attachment=True
    )
