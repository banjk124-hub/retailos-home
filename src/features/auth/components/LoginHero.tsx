import { ArrowDown, Sparkles } from 'lucide-react';
import { Brand, BrandMotion } from '../../../shared/brand';
import { Icon, MotionIcon } from '../../../shared/icons';

export function LoginHero() {
  return (
    <section className="login-hero" aria-label="RetailOS">
      <header className="login-hero__brand">
        <BrandMotion className="login-hero__brand-motion">
          <Brand variant="full" surface="light" />
        </BrandMotion>
        <span className="login-hero__edition">WORKSPACE NỘI BỘ</span>
      </header>

      <div className="login-hero__message">
        <span className="login-hero__eyebrow">
          <Icon icon={Sparkles} size="sm" />
          KHÔNG GIAN VẬN HÀNH BÁN LẺ
        </span>
        <h1>
          Vận hành<br />
          <span>trong tầm tay.</span>
        </h1>
        <p>
          Một không gian làm việc thống nhất cho hoạt động tại cửa hàng.
        </p>

      </div>

      <div className="login-hero__foot">
        <span><i aria-hidden="true" /> TRUY CẬP DÀNH CHO NHÂN VIÊN</span>
        <span className="login-hero__scroll" aria-hidden="true">
          <MotionIcon icon={ArrowDown} variant="navigation" size={15} />
        </span>
      </div>
    </section>
  );
}
