from flask import request
from flask_restful import Resource
from app.utils.logger import get_logger, log_request_info, log_response_info
from app.models.organization import Organization

logger = get_logger(__name__)


class OrganizationListResource(Resource):
    """Resource for listing organizations for autocomplete"""

    def get(self):
        """Get list of organizations, optionally filtered by search query"""
        log_request_info(logger, request)
        
        try:
            # Get query parameter for filtering
            search = request.args.get('q', '').strip()
            
            # Use database search with limit of 50 for performance
            organizations = Organization.search(search, limit=50)
            
            # Extract organization names
            result = [org.name for org in organizations]
            
            response_data = {
                "organizations": result,
                "total": len(result)
            }
            
            log_response_info(logger, response_data, 200)
            return response_data, 200
            
        except Exception as e:
            logger.exception(f"Error retrieving organizations: {str(e)}")
            return {"message": "Error retrieving organizations"}, 500