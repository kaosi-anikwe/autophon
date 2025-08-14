import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { Search, Building } from "lucide-react";

import { registerSchema, type RegisterFormData } from "../../lib/schemas";
import { useAppDispatch, useAppSelector } from "../../hooks/useAppDispatch";
import { register as registerUser, clearError } from "../../store/authSlice";
import { useToast } from "../../hooks/useToast";
import UserGuides from "../features/UserGuides";
import Captcha from "../features/Captcha";
import { PrivacyAgreementModal } from "../modals/PrivacyAgreementModal";

// Dummy organizations array - replace with real data later
const ORGANIZATIONS = [
  "Harvard University",
  "Stanford University",
  "Massachusetts Institute of Technology",
  "University of California, Berkeley",
  "Oxford University",
  "Cambridge University",
  "Carnegie Mellon University",
  "University of Toronto",
  "University of Washington",
  "Yale University",
  "Princeton University",
  "California Institute of Technology",
  "University of Pennsylvania",
  "Columbia University",
  "Cornell University",
  "University of Michigan",
  "Johns Hopkins University",
  "University of Chicago",
  "Northwestern University",
  "Duke University",
];

export default function RegisterForm() {
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [affiliation, setAffiliation] = useState("Non-affiliated");
  const [orgSearchTerm, setOrgSearchTerm] = useState("");
  const [showOrgSuggestions, setShowOrgSuggestions] = useState(false);
  const [isFreeformOrg, setIsFreeformOrg] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const { error, isAuthenticated } = useAppSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  // Watch form values to check if all fields are filled
  const watchedValues = watch();

  useEffect(() => {
    if (isAuthenticated && !hasNavigated) {
      console.log("Registration successful, showing toast and navigating...");
      toast.success(
        "Welcome to Autophon! Your account has been created successfully.",
        "Registration Successful"
      );
      navigate("/dashboard");
      setHasNavigated(true);
    }
  }, [isAuthenticated, hasNavigated, navigate, toast]);

  useEffect(() => {
    // Clear error when component mounts
    dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    // Show error toast when error occurs
    if (error) {
      toast.error(error, "Registration Failed");
    }
  }, [error, toast]);

  // Clear organization and industry fields when affiliation changes
  useEffect(() => {
    if (affiliation === "Academia") {
      setValue("industry", "");
    } else if (affiliation === "Industry") {
      setValue("org", "");
      // Reset organization autocomplete state
      setOrgSearchTerm("");
      setShowOrgSuggestions(false);
      setIsFreeformOrg(false);
    } else {
      // Non-affiliated - clear both
      setValue("org", "");
      setValue("industry", "");
      // Reset organization autocomplete state
      setOrgSearchTerm("");
      setShowOrgSuggestions(false);
      setIsFreeformOrg(false);
    }
  }, [affiliation, setValue]);

  // Filter organizations based on search term
  const filteredOrganizations = ORGANIZATIONS.filter((org) =>
    org.toLowerCase().includes(orgSearchTerm.toLowerCase())
  ).slice(0, 5); // Limit to 5 suggestions

  // Handle organization input change
  const handleOrgInputChange = (value: string) => {
    setOrgSearchTerm(value);
    setValue("org", value);
    if (!isFreeformOrg && value.length > 0) {
      setShowOrgSuggestions(true);
    } else {
      setShowOrgSuggestions(false);
    }
  };

  // Handle organization selection from dropdown
  const handleOrgSelect = (org: string) => {
    setOrgSearchTerm(org);
    setValue("org", org);
    setShowOrgSuggestions(false);
  };

  // Toggle between autocomplete and freeform
  const handleToggleFreeform = (checked: boolean) => {
    setIsFreeformOrg(checked);
    setShowOrgSuggestions(false);
    if (!checked) {
      // Switching back to autocomplete, clear the field
      setOrgSearchTerm("");
      setValue("org", "");
    }
  };

  // Check if all required fields are filled
  const isFormComplete = () => {
    const { email, first_name, last_name, password, confirmPassword } =
      watchedValues;

    // Check required fields
    if (!email || !first_name || !last_name || !password || !confirmPassword) {
      return false;
    }

    // Check affiliation-specific fields
    if (affiliation === "Academia" && !orgSearchTerm.trim()) {
      return false;
    }
    if (affiliation === "Industry" && !watchedValues.industry?.trim()) {
      return false;
    }

    return true;
  };

  // Handle captcha verification
  const handleCaptchaVerify = (verified: boolean) => {
    setCaptchaVerified(verified);
    if (verified) {
      // Show privacy modal after successful captcha verification
      setShowPrivacyModal(true);
    }
  };

  // Handle privacy agreement and auto-submit form
  const handlePrivacyAgree = () => {
    console.log("Privacy agreement handler called");
    setPrivacyAgreed(true);
    setShowPrivacyModal(false);
    console.log("Privacy state should now be true");
  };

  // Handle privacy modal close
  const handlePrivacyClose = () => {
    setShowPrivacyModal(false);
  };

  // Handle reopening privacy modal
  const handleReopenPrivacy = () => {
    setShowPrivacyModal(true);
  };

  // Handle register button click - show captcha if form is complete
  const handleRegisterClick = () => {
    if (!isFormComplete()) {
      toast.warning("Please fill in all required fields.", "Incomplete Form");
      return;
    }

    if (!agreeToTerms) {
      toast.warning(
        "Please agree to cite Autophon in your research outputs.",
        "Terms Required"
      );
      return;
    }

    setShowCaptcha(true);
  };

  const onSubmit = useCallback(
    async (data: RegisterFormData) => {
      if (!captchaVerified || !privacyAgreed) {
        console.log("Verification check failed:", {
          captchaVerified,
          privacyAgreed,
        });
        toast.warning(
          "Please complete all verification steps.",
          "Verification Required"
        );
        return;
      }

      if (formSubmitted) {
        console.log("Form already submitted, skipping...");
        return;
      }

      console.log("Form submission data:", {
        ...data,
        affiliation,
        agreeToTerms,
        privacyAgreed,
      });

      // Mark form as submitted to prevent repeated submissions
      setFormSubmitted(true);

      // For now, just console log - actual registration will come later
      // toast.success(
      //   "Registration data logged to console. All verifications completed!",
      //   "Debug Mode"
      // );

      // Uncomment when ready to actually register:
      const { confirmPassword: removePassword, ...userData } = data;
      console.log(`not submitting confirm password ${removePassword}`);
      dispatch(registerUser(userData));
    },
    [
      captchaVerified,
      privacyAgreed,
      formSubmitted,
      toast,
      affiliation,
      agreeToTerms,
      dispatch,
    ]
  );

  // Auto-submit form when privacy is agreed (must be after onSubmit definition)
  useEffect(() => {
    console.log("Privacy state changed:", {
      captchaVerified,
      privacyAgreed,
      formSubmitted,
    });
    if (captchaVerified && privacyAgreed && !formSubmitted) {
      console.log("Both captcha and privacy verified, submitting form...");
      // Small delay for better UX
      const timer = setTimeout(() => {
        handleSubmit(onSubmit)();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [captchaVerified, privacyAgreed, formSubmitted, handleSubmit, onSubmit]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 my-4">
      <div className="space-y-2">
        <label htmlFor="email" className="floating-label">
          Email address
          <input
            id="email"
            type="email"
            placeholder="john@example.com"
            {...register("email")}
            className={
              errors.email ? "input border-accent w-full" : "input w-full"
            }
          />
          {errors.email && (
            <p className="text-accent text-sm">{errors.email.message}</p>
          )}
        </label>
      </div>

      <div className="space-y-2">
        <label htmlFor="confirm-email" className="floating-label">
          Confirm email address
          <input
            id="confirm-email"
            type="email"
            placeholder="john@example.com"
            {...register("email")}
            className={
              errors.email ? "input border-accent w-full" : "input w-full"
            }
          />
          {errors.email && (
            <p className="text-accent text-sm">{errors.email.message}</p>
          )}
        </label>
      </div>

      <div className="space-y-2">
        <fieldset className="fieldset">
          <legend className="fieldset-legend text-base font-normal">
            Title
          </legend>
          <select
            id="title"
            defaultValue="No title"
            {...register("title")}
            className="select w-full"
          >
            <option disabled={true}>Choose a title</option>
            <option>No title</option>
            <option>Mr</option>
            <option>Mrs</option>
            <option>Miss</option>
            <option>Ms</option>
            <option>Dr</option>
            <option>Prof</option>
          </select>
        </fieldset>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="first_name" className="floating-label">
            First Name
            <input
              id="first_name"
              placeholder="John"
              {...register("first_name")}
              className={errors.first_name ? "input border-accent" : "input"}
            />
            {errors.first_name && (
              <p className="text-accent text-sm">{errors.first_name.message}</p>
            )}
          </label>
        </div>
        <div className="space-y-2">
          <label htmlFor="last_name" className="floating-label">
            Last Name
            <input
              id="last_name"
              placeholder="Doe"
              {...register("last_name")}
              className={errors.last_name ? "input border-accent" : "input"}
            />
            {errors.last_name && (
              <p className="text-accent text-sm">{errors.last_name.message}</p>
            )}
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <fieldset className="fieldset">
          <legend className="fieldset-legend text-base font-normal">
            Affiliation
          </legend>
          <select
            id="affiliation"
            value={affiliation}
            onChange={(e) => setAffiliation(e.target.value)}
            className="select w-full"
          >
            <option disabled={true}>Choose affiliation</option>
            <option>Non-affiliated</option>
            <option>Academia</option>
            <option>Industry</option>
          </select>
        </fieldset>
      </div>

      {affiliation === "Academia" && (
        <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-2">
            <label htmlFor="org" className="floating-label">
              Organization
              <div className="relative">
                <div className="relative">
                  <input
                    id="org"
                    value={orgSearchTerm}
                    onChange={(e) => handleOrgInputChange(e.target.value)}
                    onFocus={() =>
                      !isFreeformOrg &&
                      orgSearchTerm.length > 0 &&
                      setShowOrgSuggestions(true)
                    }
                    onBlur={() =>
                      setTimeout(() => setShowOrgSuggestions(false), 200)
                    }
                    placeholder={
                      isFreeformOrg
                        ? "Enter organization name"
                        : "Start typing to search..."
                    }
                    className="input w-full border-primary/30 focus:border-primary pl-10"
                  />
                  <div className="absolute left-3 top-3/4 transform -translate-y-1/2 text-base-content/40">
                    {isFreeformOrg ? (
                      <Building size={18} />
                    ) : (
                      <Search size={18} />
                    )}
                  </div>
                </div>

                {/* Autocomplete dropdown */}
                {showOrgSuggestions &&
                  !isFreeformOrg &&
                  filteredOrganizations.length > 0 && (
                    <div className="absolute z-10 w-full bg-base-100 border border-base-300 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                      {filteredOrganizations.map((org, index) => (
                        <button
                          key={index}
                          type="button"
                          className="w-full text-left px-4 py-2 hover:bg-base-200 first:rounded-t-lg last:rounded-b-lg flex items-center space-x-2"
                          onMouseDown={() => handleOrgSelect(org)}
                        >
                          <Building size={16} className="text-primary/60" />
                          <span>{org}</span>
                        </button>
                      ))}
                    </div>
                  )}

                {/* No results message */}
                {showOrgSuggestions &&
                  !isFreeformOrg &&
                  orgSearchTerm.length > 0 &&
                  filteredOrganizations.length === 0 && (
                    <div className="absolute z-10 w-full bg-base-100 border border-base-300 rounded-lg shadow-lg mt-1 px-4 py-2 text-base-content/60 text-sm">
                      No organizations found. Try the manual entry option below.
                    </div>
                  )}
              </div>
            </label>

            {/* Toggle checkbox */}
            <div className="flex items-center space-x-2 mt-2">
              <input
                type="checkbox"
                id="freeform-org"
                checked={isFreeformOrg}
                onChange={(e) => handleToggleFreeform(e.target.checked)}
                className="checkbox checkbox-sm"
              />
              <label
                htmlFor="freeform-org"
                className="text-sm text-base-content/70 cursor-pointer"
              >
                Can't find your organization? Enter manually
              </label>
            </div>
          </div>
        </div>
      )}

      {affiliation === "Industry" && (
        <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
          <label htmlFor="industry" className="floating-label">
            Industry
            <input
              id="industry"
              placeholder="Technology, Healthcare, Finance, etc."
              {...register("industry")}
              className="input w-full border-secondary/30 focus:border-secondary"
            />
          </label>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="password" className="floating-label">
          Password
          <input
            id="password"
            type="password"
            placeholder="Create a strong password"
            {...register("password")}
            className={
              errors.password ? "input border-accent w-full" : "input w-full"
            }
          />
          {errors.password && (
            <p className="text-accent text-sm">{errors.password.message}</p>
          )}
        </label>
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword">
          Confirm Password
          <input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            {...register("confirmPassword")}
            className={
              errors.confirmPassword
                ? "input border-accent w-full"
                : "input w-full"
            }
          />
          {errors.confirmPassword && (
            <p className="text-accent text-sm">
              {errors.confirmPassword.message}
            </p>
          )}
        </label>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-1">
          <input
            type="checkbox"
            id="agreeToTerms"
            checked={agreeToTerms}
            onChange={(e) => setAgreeToTerms(e.target.checked)}
            className="checkbox"
          />
        </div>
        <div className="col-span-11">
          <label htmlFor="agreeToTerms" className="cursor-pointer">
            <p className="text-base-300 text-sm leading-0">
              I agree to cite Autophon in any research outputs in accordance
              with the "How to cite" section in the below language-specific user
              guides:
            </p>
          </label>
        </div>
      </div>

      <UserGuides>
        <h3 className="text-lg font-bold mb-0">User Guides</h3>
      </UserGuides>

      {!showCaptcha ? (
        <button
          type="button"
          onClick={handleRegisterClick}
          className="btn btn-primary font-thin w-[20%]"
          disabled={!isFormComplete() || !agreeToTerms}
        >
          Register
        </button>
      ) : (
        <>
          <div className="w-full pt-2">
            <Captcha onVerify={handleCaptchaVerify} isVisible={showCaptcha} />
          </div>

          {captchaVerified && !privacyAgreed && !showPrivacyModal && (
            <div className="text-left py-4 space-y-3">
              <p className="text-base-content/70 text-sm">
                You must agree to our privacy terms to complete registration.
              </p>
              <button
                type="button"
                onClick={handleReopenPrivacy}
                className="btn btn-primary font-thin"
              >
                Review Privacy Terms
              </button>
            </div>
          )}

          {captchaVerified && !privacyAgreed && showPrivacyModal && (
            <div className="text-center py-4">
              <p className="text-base-content/70 text-sm">
                Please review and agree to our privacy terms to continue.
              </p>
            </div>
          )}

          {captchaVerified && privacyAgreed && !formSubmitted && (
            <div className="text-center py-4">
              <div className="flex flex-col items-center gap-3">
                <div className="loading loading-spinner loading-lg text-primary"></div>
                <p className="text-primary font-medium">
                  Processing registration...
                </p>
                <p className="text-base-content/60 text-sm">
                  Thank you for agreeing to our privacy terms!
                </p>
              </div>
            </div>
          )}

          {formSubmitted && (
            <div className="text-center py-4">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-success"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-success font-medium">
                  Registration Complete!
                </p>
                <p className="text-base-content/60 text-sm">
                  Check the console for your registration data.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      <div className="text-left text-sm">
        Already have an account?{" "}
        <Link to="/login" className="text-primary hover:underline">
          Login
        </Link>
      </div>

      {/* Privacy Agreement Modal */}
      <PrivacyAgreementModal
        isOpen={showPrivacyModal}
        onAgree={handlePrivacyAgree}
        onClose={handlePrivacyClose}
      />
    </form>
  );
}
