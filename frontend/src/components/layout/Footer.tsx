export function Footer() {
  return (
    <footer className="footer sm:footer-horizontal footer-center bg-neutral text-neutral-content/60 p-4 py-12">
      <aside>
        <p>
          Copyright © {new Date().getFullYear()}{" "}
          <a
            href="https://www.nateyoung.se"
            rel="noopener"
            target="_blank"
            className="underline"
          >
            Natan Young
          </a>
        </p>
      </aside>
    </footer>
  );
}
