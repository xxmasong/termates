import { Icon } from '@/components';
import { ROUTES } from '@/constants';
import { COPY } from '../constants';
import { ThemeToggle } from './ThemeToggle';
interface LandingFooterProps {
  children?: never;
}
export const LandingFooter: React.FC<LandingFooterProps> = () => (
  <footer className="landing-footer">
    <div>
      <span className="landing-brand">
        <Icon name="logo" />
        {COPY.brand}
      </span>
      <p>{COPY.footerTagline}</p>
    </div>
    <div className="landing-footer__columns">
      <nav>
        <h3>Product</h3>
        <div className="landing-footer__links">
          <a href="#features">Features</a>
          <a href="#keeper">The Keeper</a>
          <a href="#compare">Compare</a>
          <a href="#pricing">Pricing</a>
        </div>
      </nav>
      <nav>
        <h3>Resources</h3>
        <div className="landing-footer__links">
          <a href="#faq">FAQ</a>
          <a href="https://github.com/xxmasong/termhive-v2">GitHub</a>
        </div>
      </nav>
      <nav>
        <h3>Account</h3>
        <div className="landing-footer__links">
          <a href={ROUTES.LOGIN}>{COPY.signIn}</a>
          <a href={ROUTES.SIGNUP}>{COPY.getStarted}</a>
        </div>
      </nav>
    </div>
    <div className="landing-footer__bottom">
      <p>{COPY.footer}</p>
      <ThemeToggle />
    </div>
  </footer>
);
