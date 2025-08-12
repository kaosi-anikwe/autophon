export function TeamPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Our Team</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Meet the researchers and developers behind Autophon.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="text-center">
          <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Team Member</h3>
          <p className="text-gray-600 mb-2">Role</p>
          <p className="text-sm text-gray-500">
            Brief description about the team member and their contribution to the project.
          </p>
        </div>
      </div>
    </div>
  )
}