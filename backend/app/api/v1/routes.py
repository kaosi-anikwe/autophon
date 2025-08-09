from flask import Blueprint
from flask_restful import Api
from app.resources.auth import Register, Login, Logout
from app.resources.tasks import TaskListResource, TaskResource
from app.resources.dictionaries import DictionaryListResource, DictionaryResource
from app.resources.users import UserResource

api_bp = Blueprint("api", __name__)
api = Api(api_bp)

# Auth routes
api.add_resource(Register, "/auth/register")
api.add_resource(Login, "/auth/login")
api.add_resource(Logout, "/auth/logout")

# Resource routes
api.add_resource(TaskListResource, "/tasks")
api.add_resource(TaskResource, "/tasks/<string:task_id>")
api.add_resource(DictionaryListResource, "/dictionaries")
api.add_resource(DictionaryResource, "/dictionaries/<string:dict_id>")
api.add_resource(UserResource, "/users/<string:user_id>")
