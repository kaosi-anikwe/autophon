import { useState } from "react";
import { BadgeCheck, SquarePen, CircleX } from "lucide-react";

import type { User } from "@/types/api";
import EditProfileForm from "@/components/forms/EditProfileForm";

type UserProfileProps = {
  user: User | null;
};

export default function UserProfile({ user }: UserProfileProps) {
  const [profileEdit, setProfileEdit] = useState(false);

  console.log(user);

  return (
    <>
      <div className="md:col-span-4">
        <div className="card bg-base-100 shadow-lg mb-6 pb-4 border border-base-200">
          <div className="avatar mx-auto my-4">
            <div className="w-24 rounded-full">
              <img
                alt="Person"
                src="https://img.daisyui.com/images/profile/demo/batperson@192.webp"
              />
            </div>
          </div>
          <h2 className="text-center text-2xl font-bold">Dr Nate Young</h2>
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
            "Welcome NAME"
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
                  <p className="text-lg text-base-300">Dr Nate Y2312010</p>
                </li>
                <li className="list-row after:bg-base-200 after:border-b">
                  <p className="text-lg font-bold mr-8">Email</p>
                  <div className="flex items-center">
                    <p className="text-lg text-base-300 mr-4">
                      test@something.com
                    </p>
                    <div className="tooltip" data-tip="Email verified">
                      <BadgeCheck className="text-success mr-4" />
                    </div>
                    <p role="button" className="text-accent cursor-pointer">
                      Verify Email
                    </p>
                  </div>
                </li>
                <li className="list-row after:bg-base-200 after:border-b">
                  <p className="text-lg font-bold mr-8">Affiliation</p>
                  <p className="text-lg text-base-300">No Affiliation</p>
                </li>
                <li className="list-row">
                  <p className="text-lg font-bold mr-8">Unique ID</p>
                  <p className="text-lg text-base-300">adf89320</p>
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
