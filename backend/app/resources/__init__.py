# Authentication resources
from .auth import (
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
)

# User resources
from .users import (
    UserListResource,
    UserResource,
    UserProfileResource,
    UserTasksResource,
)

# Language resources
from .languages import (
    LanguageListResource,
    LanguageResource,
    LanguageByCodeResource,
    LanguageEnginesResource,
    PublicLanguageListResource,
)

# Engine resources
from .engines import (
    EngineListResource,
    EngineResource,
    EngineByCodeResource,
    EngineLanguagesResource,
)

# Task resources
from .tasks import (
    TaskListResource,
    TaskResource,
    TaskFilesResource,
    TaskFileNamesResource,
    TaskCancelResource,
    TaskBulkDeleteResource,
    TaskHistoryResource,
    TaskMonthlyReportResource,
)

# Dictionary resources - all unused, removing imports

# Configuration resources
from .config import (
    ConfigResource,
)

# Upload Status and Download resources
from .upload_status import (
    UploadStatusResource,
    TaskDownloadResource,
    StaticDownloadResource,
    TaskMissingWordsResource,
)

# User Dictionary resources
from .user_dictionary import (
    UserDictionaryUploadResource,
    UserDictionaryResource,
    UserDictionaryListResource,
    UserDictionaryDeleteResource,
)

# Aligner resources
from .aligner import (
    AlignerDashboardResource,
    AlignTaskResource,
    AlignmentQueueResource,
)

# Language Change resources
from .language_change import (
    LanguageChangeResource,
)

# Reupload resources
from .reupload import (
    TaskReuploadResource,
    TaskReuploadInfoResource,
)

# Upload resources
from .upload import (
    FileUploadResource,
)

# Team resources
from .team import (
    TeamResource,
    TeamImageResource,
    ContactEmailResource,
)

# Captcha resources
from .captcha import (
    CaptchaResource,
    CaptchaCleanupResource,
)

# Admin resources
from .admin import (
    BlockedEmailsResource,
    SiteStatusResource,
    AdminUsersResource,
    AdminDownloadsResource,
    AdminHistoryResource,
)

__all__ = [
    # Authentication resources
    "Register",
    "Login",
    "Logout",
    "RefreshToken",
    "ChangePassword",
    "ResetPasswordRequest",
    "VerifyToken",
    "LogoutAllDevices",
    "TokenCleanup",
    "RevokeUserTokens",
    # User resources
    "UserListResource",
    "UserResource",
    "UserProfileResource",
    "UserTasksResource",
    # Language resources
    "LanguageListResource",
    "LanguageResource",
    "LanguageByCodeResource",
    "LanguageEnginesResource",
    "PublicLanguageListResource",
    # Engine resources
    "EngineListResource",
    "EngineResource",
    "EngineByCodeResource",
    "EngineLanguagesResource",
    # Task resources
    "TaskListResource",
    "TaskResource",
    "TaskFilesResource",
    "TaskFileNamesResource",
    "TaskCancelResource",
    "TaskBulkDeleteResource",
    "TaskHistoryResource",
    "TaskMonthlyReportResource",
    # Dictionary resources - all removed as unused
    # Configuration resources
    "ConfigResource",
    # Upload Status and Download resources
    "UploadStatusResource",
    "TaskDownloadResource",
    "StaticDownloadResource",
    "TaskMissingWordsResource",
    # User Dictionary resources
    "UserDictionaryUploadResource",
    "UserDictionaryResource",
    "UserDictionaryListResource",
    "UserDictionaryDeleteResource",
    # Aligner resources
    "AlignerDashboardResource",
    "AlignTaskResource",
    "AlignmentQueueResource",
    # Language Change resources
    "LanguageChangeResource",
    # Reupload resources
    "TaskReuploadResource",
    "TaskReuploadInfoResource",
    # Upload resources
    "FileUploadResource",
    # Team resources
    "TeamResource",
    "TeamImageResource",
    "ContactEmailResource",
    # Captcha resources
    "CaptchaResource",
    "CaptchaCleanupResource",
    # Admin resources
    "BlockedEmailsResource",
    "SiteStatusResource",
    "AdminUsersResource",
    "AdminDownloadsResource",
    "AdminHistoryResource",
]
