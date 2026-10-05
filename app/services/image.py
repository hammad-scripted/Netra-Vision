

def validate_image(image):
    """
    Validate the uploaded image file.

    Args:
        image: The uploaded image file.

    Returns:
        bool: True if the image is valid, False otherwise.
    """
    # Check if the image is None
    if image is None:
        return False

    # Check the file size (e.g., limit to 10MB)
    max_size = 10 * 1024 * 1024  # 10MB
    if len(image.read()) > max_size:
        return False

    # Reset the file pointer to the beginning after reading
    image.seek(0)

    # Check the file format (e.g., allow only JPEG and PNG)
    allowed_formats = ['image/jpeg', 'image/png']
    if image.content_type not in allowed_formats:
        return False

    return True                     