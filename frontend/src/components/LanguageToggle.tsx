import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

const langs = ['es', 'en', 'pt'] as const;

export function LanguageToggle({ collapsed }: { collapsed?: boolean }) {
  const { i18n, t } = useTranslation('common');
  const current = i18n.language?.slice(0, 2) || 'es';

  if (collapsed) {
    return (
      <button
        onClick={() => {
          const idx = langs.indexOf(current as typeof langs[number]);
          const next = langs[(idx + 1) % langs.length];
          i18n.changeLanguage(next);
        }}
        className="flex items-center justify-center px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase text-fuega-text-muted hover:text-fuega-text-primary hover:bg-fuega-card-hover transition-colors w-full"
        title={t('common:changeLanguage')}
      >
        {current.toUpperCase()}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5">
      {langs.map((lang) => (
        <button
          key={lang}
          onClick={() => i18n.changeLanguage(lang)}
          className={clsx(
            'flex-1 px-1.5 py-1 rounded text-[10px] font-bold uppercase transition-colors',
            current === lang
              ? 'bg-fuega-orange text-white'
              : 'text-fuega-text-muted hover:text-fuega-text-primary hover:bg-fuega-card-hover'
          )}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}
