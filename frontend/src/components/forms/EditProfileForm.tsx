import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/hooks/useAppDispatch";
import { updateProfile, clearError } from "@/store/authSlice";
import { useToast } from "@/contexts/ToastContext";

const profileSchema = z.object({
  title: z.string().optional(),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email").optional(),
  org: z.string().optional(),
  industry: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface EditProfileFormProps {
  onSuccess?: () => void;
}

export default function EditProfileForm({ onSuccess }: EditProfileFormProps) {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { user, isLoading, error } = useAppSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      title: user?.title || "",
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      email: user?.email || "",
      org: user?.org || "",
      industry: user?.industry || "",
    },
  });

  useEffect(() => {
    // Clear any previous errors when component mounts
    dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    // Reset form with user data when user changes
    if (user) {
      reset({
        title: user.title || "",
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        org: user.org || "",
        industry: user.industry || "",
      });
    }
  }, [user, reset]);

  useEffect(() => {
    // Show error toast when error occurs
    if (error) {
      toast.error(error, "Update Failed");
    }
  }, [error, toast]);

  const onSubmit = async (data: ProfileFormData) => {
    // Remove empty strings and convert them to undefined
    const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== "" && value !== undefined) {
        acc[key as keyof ProfileFormData] = value;
      }
      return acc;
    }, {} as Partial<ProfileFormData>);

    try {
      await dispatch(updateProfile(cleanData)).unwrap();
      toast.success("Profile updated successfully!", "Success");
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      // Error is already handled by the effect above
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 my-4">
      <div className="space-y-2">
        <label htmlFor="title" className="floating-label">
          Title
          <input
            {...register("title")}
            id="title"
            placeholder="Dr., Prof., etc."
            className="input w-full"
            disabled={isLoading}
          />
        </label>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="first_name" className="floating-label">
            First Name
            <input 
              {...register("first_name")}
              id="first_name" 
              placeholder="John" 
              className={`input ${errors.first_name ? "input-error" : ""}`}
              disabled={isLoading}
            />
            {errors.first_name && (
              <span className="text-error text-sm">{errors.first_name.message}</span>
            )}
          </label>
        </div>
        <div className="space-y-2">
          <label htmlFor="last_name" className="floating-label">
            Last Name
            <input 
              {...register("last_name")}
              id="last_name" 
              placeholder="Doe" 
              className={`input ${errors.last_name ? "input-error" : ""}`}
              disabled={isLoading}
            />
            {errors.last_name && (
              <span className="text-error text-sm">{errors.last_name.message}</span>
            )}
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="floating-label">
          Email address
          <input
            {...register("email")}
            type="email"
            className={`input w-full ${errors.email ? "input-error" : ""}`}
            disabled={user?.verified || isLoading}
            placeholder={user?.verified ? "Verified email cannot be changed" : "your.email@example.com"}
          />
          {errors.email && (
            <span className="text-error text-sm">{errors.email.message}</span>
          )}
        </label>
        {user?.verified ? (
          <p className="text-sm text-base-300">✓ Verified email address cannot be modified</p>
        ) : (
          <p className="text-sm text-warning">⚠ Email can be changed until verified</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="org" className="floating-label">
          Organization
          <input
            {...register("org")}
            id="org"
            placeholder="University, Company, etc."
            className="input w-full"
            disabled={isLoading}
          />
        </label>
      </div>

      <div className="space-y-2">
        <label htmlFor="industry" className="floating-label">
          Industry
          <input
            {...register("industry")}
            id="industry"
            placeholder="Education, Research, etc."
            className="input w-full"
            disabled={isLoading}
          />
        </label>
      </div>

      <button 
        type="submit" 
        className="btn btn-primary font-thin w-[40%]"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save changes"
        )}
      </button>
    </form>
  );
}
