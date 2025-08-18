from flask import Blueprint
from flask_restful import Api
from app.resources.admin import (
    BlockedEmailsResource,
    SiteStatusResource,
    AdminUsersResource,
    AdminDownloadsResource,
    AdminHistoryResource,
    AdminDashboardResource,
    AdminUserActionsResource,
)

admin_api_bp = Blueprint("admin_api", __name__)
admin_api = Api(admin_api_bp)

# Admin routes
admin_api.add_resource(BlockedEmailsResource, "/blocked-emails")
admin_api.add_resource(SiteStatusResource, "/site-status")
admin_api.add_resource(AdminUsersResource, "/users")
admin_api.add_resource(AdminDownloadsResource, "/downloads/users")
admin_api.add_resource(AdminHistoryResource, "/downloads/history")
admin_api.add_resource(AdminDashboardResource, "/dashboard")
admin_api.add_resource(AdminUserActionsResource, "/user-actions")
