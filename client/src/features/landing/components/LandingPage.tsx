import { LANDING_TITLE } from '../constants';
import { useDocumentTitle } from '../hooks';
import { Hero } from './Hero';
import { LandingFooter } from './LandingFooter';
import { LandingNav } from './LandingNav';
import { ProblemSection } from './ProblemSection';
import { WorksWith } from './WorksWith';
import '../styles.css';

interface LandingPageProps {
  children?: never;
}

export const LandingPage: React.FC<LandingPageProps> = () => {
  useDocumentTitle(LANDING_TITLE);
  return (
    <div className="landing">
      <a className="landing-skip" href="#main">
        Skip to content
      </a>
      <LandingNav />
      <main id="main">
        <Hero />
        <WorksWith />
        <ProblemSection />
      </main>
      <LandingFooter />
    </div>
  );
};
