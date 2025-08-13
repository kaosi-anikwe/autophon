export function Footer() {
  return (
    <footer className="footer sm:footer-horizontal footer-center bg-primary text-base-100 p-4 py-12">
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
