import { useState } from "react";
import { BadgeCheck, SquarePen, CircleX } from "lucide-react";

import type { User } from "@/types/api";
import EditProfileForm from "@/components/forms/EditProfileForm";

type UserProfileProps = {
  user: User | null;
};

export default function UserProfile({ user }: UserProfileProps) {
  const [profileEdit, setProfileEdit] = useState(false);

  return (
    <>
      <div className="md:col-span-4">
        <div className="card bg-base-100 shadow-lg mb-6 pb-4 border border-base-200">
          <div className="avatar mx-auto my-4">
            <div className="w-24 rounded-full">
              <img
                alt={user?.display_name}
                src={`https://new.autophontest.se/api/v1/static/profile/${user?.uuid}`}
              />
            </div>
          </div>
          <h2 className="text-center text-2xl font-bold">
            {user?.display_name}
          </h2>
        </div>
        <div className="card bg-base-100 shadow-lg px-4 py-2 border border-base-200">
          <h2 className="text-center text-2xl font-bold">Account management</h2>
          <p className="py-2">
            Click the button below to permanently delete your account.
          </p>
          <button type="button" className="btn btn-accent font-thin my-2">
            Delete account
          </button>
          <p className="text-base-300">
            Deleting your account is irreversible. All of your data, including
            will be permanently deleted!
          </p>
        </div>
      </div>
      <div className="md:col-span-8">
        <h2 className="text-2xl font-bold text-left">
          {!profileEdit ? (
            `Welcome ${user?.display_name}`
          ) : (
            <div className="flex items-center">
              <h3 className="font-bold text-xl mr-2">Edit account details</h3>
              <div className="tooltip" data-tip="Cancel Edit">
                <CircleX
                  className="text-accent cursor-pointer w-5"
                  onClick={() => setProfileEdit(false)}
                />
              </div>
            </div>
          )}
        </h2>
        {!profileEdit && (
          <>
            <div className="card bg-base-100 shadow-lg border border-base-200">
              <ul className="list bg-base-100 rounded-box shadow-md">
                <li className="list-row after:bg-base-200 after:border-b">
                  <p className="text-lg font-bold mr-8">Name</p>
                  <p className="text-lg text-base-300">{user?.display_name}</p>
                </li>
                <li className="list-row after:bg-base-200 after:border-b">
                  <p className="text-lg font-bold mr-8">Email</p>
                  <div className="flex items-center">
                    <p className="text-lg text-base-300 mr-4">{user?.email}</p>
                    {user?.verified && (
                      <div className="tooltip" data-tip="Email verified">
                        <BadgeCheck className="text-success mr-4" />
                      </div>
                    )}
                    {!user?.verified && (
                      <p role="button" className="text-accent cursor-pointer">
                        Verify Email
                      </p>
                    )}
                  </div>
                </li>
                <li className="list-row after:bg-base-200 after:border-b">
                  <p className="text-lg font-bold mr-8">Affiliation</p>
                  <p className="text-lg text-base-300">
                    {user?.org || user?.industry || "No affiliation"}
                  </p>
                </li>
                <li className="list-row">
                  <p className="text-lg font-bold mr-8">Unique ID</p>
                  <p className="text-lg text-base-300">{user?.uuid}</p>
                </li>
              </ul>
            </div>
            <div
              className="flex items-center my-4 cursor-pointer"
              onClick={() => setProfileEdit(true)}
            >
              <h3 className="font-bold text-lg mr-2">Update your profile</h3>
              <SquarePen className="text-accent w-4" />
            </div>
          </>
        )}
        {profileEdit && <EditProfileForm />}
      </div>
    </>
  );
}
