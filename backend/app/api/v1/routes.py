from flask import Blueprint
from flask_restful import Api
from app.resources import (
    # Authentication
    Register,
    Login,
    Logout,
    RefreshToken,
    ChangePassword,
    ResetPasswordRequest,
    VerifyToken,
    LogoutAllDevices,
    TokenCleanup,
    RevokeUserTokens,
    # Users
    UserListResource,
    UserResource,
    UserProfileResource,
    UserTasksResource,
    # Languages
    LanguageListResource,
    LanguageResource,
    LanguageByCodeResource,
    LanguageEnginesResource,
    # Engines
    EngineListResource,
    EngineResource,
    EngineByCodeResource,
    EngineLanguagesResource,
    # Tasks
    TaskListResource,
    TaskResource,
    TaskStatusResource,
    TaskFilesResource,
    TaskFileNamesResource,
    TaskBulkDeleteResource,
    # Dictionaries
    DictionaryListResource,
    DictionaryResource,
    UserDictionariesResource,
    DictionaryByLanguageResource,
    # Configuration
    UserLimitsResource,
)

api_bp = Blueprint("api", __name__)
api = Api(api_bp)

# Authentication routes
api.add_resource(Register, "/auth/register")
api.add_resource(Login, "/auth/login")
api.add_resource(Logout, "/auth/logout")
api.add_resource(RefreshToken, "/auth/refresh")
api.add_resource(ChangePassword, "/auth/change-password")
api.add_resource(ResetPasswordRequest, "/auth/reset-password")
api.add_resource(VerifyToken, "/auth/verify")
api.add_resource(LogoutAllDevices, "/auth/logout-all")
api.add_resource(TokenCleanup, "/auth/cleanup-tokens")
api.add_resource(RevokeUserTokens, "/auth/revoke-user-tokens")

# User routes
api.add_resource(UserListResource, "/users")
api.add_resource(UserResource, "/users/<int:user_id>")
api.add_resource(UserProfileResource, "/profile")
api.add_resource(UserTasksResource, "/users/<int:user_id>/tasks")

# Language routes
api.add_resource(LanguageListResource, "/languages")
api.add_resource(LanguageResource, "/languages/<int:language_id>")
api.add_resource(LanguageByCodeResource, "/languages/code/<string:code>")
api.add_resource(LanguageEnginesResource, "/languages/<int:language_id>/engines")

# Engine routes
api.add_resource(EngineListResource, "/engines")
api.add_resource(EngineResource, "/engines/<int:engine_id>")
api.add_resource(EngineByCodeResource, "/engines/code/<string:code>")
api.add_resource(EngineLanguagesResource, "/engines/<int:engine_id>/languages")

# Task routes
api.add_resource(TaskListResource, "/tasks")
api.add_resource(TaskResource, "/tasks/<string:task_id>")
api.add_resource(TaskStatusResource, "/tasks/<string:task_id>/status")
api.add_resource(TaskFilesResource, "/tasks/<string:task_id>/files")
api.add_resource(TaskFileNamesResource, "/tasks/<string:task_id>/file-names")
api.add_resource(TaskBulkDeleteResource, "/tasks/bulk-delete")

# Dictionary routes
api.add_resource(DictionaryListResource, "/dictionaries")
api.add_resource(DictionaryResource, "/dictionaries/<int:dict_id>")
api.add_resource(UserDictionariesResource, "/users/<int:user_id>/dictionaries")
api.add_resource(
    DictionaryByLanguageResource, "/dictionaries/language/<string:language>"
)

# Configuration routes
api.add_resource(UserLimitsResource, "/config/user-limits")
