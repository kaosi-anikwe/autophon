type CaptchaProps = {
  onVerify: (verified: boolean) => void;
};

export default function Captcha({ onVerify }: CaptchaProps) {
  function handleVerify() {
    onVerify(true);
  }
  return (
    <div className="space-y-2 w-full">
      <img src="/captcha-sample.png" alt="CAPTCHA image" />
      <input type="text" placeholder="Enter code" className="input w-full" />
      <p className="text-base-300 text-sm cursor-pointer">Refresh captcha</p>
      <button
        className="btn btn-primary font-thin"
        type="button"
        onClick={handleVerify}
      >
        Verify
      </button>
    </div>
  );
}
