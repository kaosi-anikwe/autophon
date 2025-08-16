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
    # Captcha
    CaptchaResource,
    CaptchaCleanupResource,
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
    PublicLanguageListResource,
    # Engines
    EngineListResource,
    EngineResource,
    EngineByCodeResource,
    EngineLanguagesResource,
    # Tasks
    TaskListResource,
    TaskResource,
    TaskFilesResource,
    TaskFileNamesResource,
    TaskCancelResource,
    TaskBulkDeleteResource,
    TaskHistoryResource,
    TaskMonthlyReportResource,
    # Dictionaries - removed unused imports
    # Configuration
    ConfigResource,
    # Upload Status and Download resources
    UploadStatusResource,
    TaskDownloadResource,
    StaticDownloadResource,
    TaskMissingWordsResource,
    # User Dictionary resources
    UserDictionaryUploadResource,
    UserDictionaryResource,
    UserDictionaryListResource,
    UserDictionaryDeleteResource,
    # Aligner resources
    AlignerDashboardResource,
    AlignTaskResource,
    AlignmentQueueResource,
    # Language Change resources
    LanguageChangeResource,
    # Reupload resources
    TaskReuploadResource,
    TaskReuploadInfoResource,
    # Upload resources
    FileUploadResource,
    # Team resources
    TeamResource,
    TeamImageResource,
    ContactEmailResource,
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

# Captcha routes
api.add_resource(CaptchaResource, "/auth/register-captcha")
api.add_resource(CaptchaCleanupResource, "/auth/captcha-cleanup")

# User routes
api.add_resource(UserListResource, "/users")
api.add_resource(UserResource, "/users/<int:user_id>")
api.add_resource(UserProfileResource, "/profile")
api.add_resource(UserTasksResource, "/users/<int:user_id>/tasks")

# Language routes
api.add_resource(LanguageListResource, "/languages")
api.add_resource(LanguageResource, "/languages/<int:language_id>")
api.add_resource(LanguageByCodeResource, "/languages/code/<string:code>")
api.add_resource(LanguageEnginesResource, "/languages/<string:language_code>/engines")
api.add_resource(PublicLanguageListResource, "/public/languages")

# Engine routes
api.add_resource(EngineListResource, "/engines")
api.add_resource(EngineResource, "/engines/<int:engine_id>")
api.add_resource(EngineByCodeResource, "/engines/code/<string:code>")
api.add_resource(EngineLanguagesResource, "/engines/<int:engine_id>/languages")

# Task routes
api.add_resource(TaskListResource, "/tasks")
api.add_resource(TaskResource, "/tasks/<string:task_id>")
api.add_resource(TaskFilesResource, "/tasks/<string:task_id>/files")
api.add_resource(TaskFileNamesResource, "/tasks/<string:task_id>/file-names")
api.add_resource(TaskCancelResource, "/tasks/<string:task_id>/cancel")
api.add_resource(TaskBulkDeleteResource, "/tasks/bulk-delete")
api.add_resource(TaskHistoryResource, "/tasks/history")
api.add_resource(TaskMonthlyReportResource, "/monthly-download")

# Dictionary routes - removed unused commented routes

# Configuration routes
api.add_resource(ConfigResource, "/config")

# Upload Status and Download routes
api.add_resource(
    UploadStatusResource,
    "/tasks/<string:task_id>/status",
    endpoint="task_status_single",
)
api.add_resource(
    TaskDownloadResource, "/tasks/<string:task_id>/download/<string:download_type>"
)
api.add_resource(StaticDownloadResource, "/static/<string:file_type>/<string:filename>")
api.add_resource(TaskMissingWordsResource, "/tasks/<string:task_id>/missing-words")

# User Dictionary routes
api.add_resource(UserDictionaryUploadResource, "/dictionaries/upload")
api.add_resource(UserDictionaryResource, "/dictionaries/get")
api.add_resource(UserDictionaryListResource, "/dictionaries/user")
api.add_resource(UserDictionaryDeleteResource, "/dictionaries/user/<string:lang_code>")

# Aligner routes
api.add_resource(AlignerDashboardResource, "/aligner/dashboard")
api.add_resource(AlignTaskResource, "/aligner/align")
# Removed unused TaskExpirationResource
api.add_resource(AlignmentQueueResource, "/aligner/queue")

# Language Change routes
api.add_resource(LanguageChangeResource, "/tasks/change-language")
# Removed unused TaskLanguageListResource

# Reupload routes
api.add_resource(TaskReuploadResource, "/tasks/<string:task_id>/reupload")
api.add_resource(TaskReuploadInfoResource, "/tasks/<string:task_id>/reupload-info")

# Upload routes
api.add_resource(FileUploadResource, "/upload")

# Team routes
api.add_resource(TeamResource, "/team")
api.add_resource(TeamImageResource, "/team-images")

# Contact routes
api.add_resource(ContactEmailResource, "/contact/send-email")
