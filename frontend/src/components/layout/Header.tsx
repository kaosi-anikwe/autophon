import { Moon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { useAppSelector } from "../../hooks/useAppDispatch";

export function Header() {
  const location = useLocation();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed z-50 w-full bg-base-100 shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="navbar text-base-content min-h-16">
          {/* Logo and navigation on the left */}
          <div className="flex-none">
            <Link
              to="/"
              className="text-2xl font-black text-primary flex items-center mr-4 pr-4"
            >
              <img src="/favicon.png" alt="Autophon" className="w-6 h-6 mr-2" />
              <p className="text-sm uppercase">Autophon</p>
            </Link>
          </div>
          <div className="flex-1">
            <div className="hidden lg:flex">
              <ul className="menu menu-horizontal px-1 space-x-1">
                {isAuthenticated && (
                  <li>
                    <Link
                      to="/history"
                      className={`${
                        isActive("/history")
                          ? "bg-base-300 text-primary-content"
                          : ""
                      }  `}
                    >
                      History
                    </Link>
                  </li>
                )}
                <li>
                  <Link
                    to="/about"
                    className={`${
                      isActive("/about")
                        ? "bg-base-300 text-primary-content"
                        : ""
                    }  `}
                  >
                    About
                  </Link>
                </li>
                {isAuthenticated && user?.admin && (
                  <li>
                    <Link
                      to="/admin"
                      className={`${
                        isActive("/admin")
                          ? "bg-base-300 text-primary-content"
                          : ""
                      }  `}
                    >
                      Admin
                    </Link>
                  </li>
                )}
                <li>
                  <Link
                    to="/support"
                    className={`${
                      isActive("/support")
                        ? "bg-base-300 text-primary-content"
                        : ""
                    }  `}
                  >
                    Support
                  </Link>
                </li>
                <li>
                  <Link
                    to="/team"
                    className={`${
                      isActive("/team")
                        ? "bg-base-300 text-primary-content"
                        : ""
                    }  `}
                  >
                    Team
                  </Link>
                </li>
                {isAuthenticated && (
                  <>
                    <li>
                      <Link
                        to="/dashboard"
                        className={`${
                          isActive("/dashboard")
                            ? "bg-base-300 text-primary-content"
                            : ""
                        }  `}
                      >
                        Aligner
                      </Link>
                    </li>
                    <li>
                      <div className="indicator">
                        <button disabled className="cursor-not-allowed">
                          Transcriber
                        </button>
                        <span className="badge badge-sm indicator-item text-xs px-2 py-1 bg-secondary text-secondary-content rounded-full">
                          coming soon
                        </span>
                      </div>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
          {/* User controls on the right */}
          <div className="flex-none">
            {/* Mobile menu button */}
            <div className="dropdown lg:hidden">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-sm">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </div>
              <ul
                tabIndex={0}
                className="menu dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow right-0"
              >
                {isAuthenticated && (
                  <li>
                    <Link
                      to="/history"
                      className={`${
                        isActive("/history")
                          ? "bg-base-300 text-primary-content"
                          : ""
                      }  `}
                    >
                      History
                    </Link>
                  </li>
                )}
                <li>
                  <Link
                    to="/about"
                    className={`${
                      isActive("/about")
                        ? "bg-base-300 text-primary-content"
                        : ""
                    }  `}
                  >
                    About
                  </Link>
                </li>
                {isAuthenticated && user?.admin && (
                  <li>
                    <Link
                      to="/admin"
                      className={`${
                        isActive("/admin")
                          ? "bg-base-300 text-primary-content"
                          : ""
                      }  `}
                    >
                      Admin
                    </Link>
                  </li>
                )}
                <li>
                  <Link
                    to="/support"
                    className={`${
                      isActive("/support")
                        ? "bg-base-300 text-primary-content"
                        : ""
                    }  `}
                  >
                    Support
                  </Link>
                </li>
                <li>
                  <Link
                    to="/team"
                    className={`${
                      isActive("/team")
                        ? "bg-base-300 text-primary-content"
                        : ""
                    }  `}
                  >
                    Team
                  </Link>
                </li>
                {isAuthenticated && (
                  <>
                    <li>
                      <Link
                        to="/dashboard"
                        className={`${
                          isActive("/dashboard")
                            ? "bg-base-300 text-primary-content"
                            : ""
                        }  `}
                      >
                        Aligner
                      </Link>
                    </li>
                    <li>
                      <div className="indicator">
                        <button disabled className="cursor-not-allowed">
                          Transcriber
                        </button>
                        <span className="badge badge-sm indicator-item text-xs px-2 py-1 bg-secondary text-secondary-content rounded-full">
                          soon
                        </span>
                      </div>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Theme toggle */}
            <div className="dropdown dropdown-end">
              <div
                tabIndex={0}
                role="button"
                className="btn btn-ghost btn-circle mr-6"
              >
                <Moon className="h-4 w-4" />
              </div>
              <ul
                tabIndex={0}
                className="menu dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow"
              >
                <li>
                  <a>Dark Theme</a>
                </li>
                <li>
                  <a>System default</a>
                </li>
              </ul>
            </div>

            {/* User profile */}
            {isAuthenticated && (
              <div className="dropdown dropdown-end">
                <div
                  tabIndex={0}
                  role="button"
                  className="btn btn-ghost btn-circle avatar"
                >
                  <div className="w-10 rounded-full">
                    <img
                      src={`https://new.autophontest.se/api/v1/static/profile/${user?.uuid}`}
                      alt="Profile Image"
                    />
                  </div>
                </div>
                <ul
                  tabIndex={0}
                  className="menu dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow-md"
                >
                  <li>
                    <Link to="/profile">Profile</Link>
                  </li>
                  <li>
                    <Link to="/logout">Logout</Link>
                  </li>
                </ul>
              </div>
            )}

            {!isAuthenticated && (
              <ul tabIndex={0} className="menu menu-horizontal px-1 space-x-1">
                <li>
                  <Link to="/login#login" className="btn font-thin">
                    Login
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="btn btn-primary font-thin">
                    Sign Up
                  </Link>
                </li>
              </ul>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
