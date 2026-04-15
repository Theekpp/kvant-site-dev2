import kvantLogo from "@assets/image_1775753659602.png";

interface Section {
  title?: string;
  content: (string | { type: "list"; items: string[] } | { type: "table"; headers: string[]; rows: string[][] })[];
}

interface LegalPageProps {
  title: string;
  subtitle?: string;
  sections: Section[];
  updatedAt?: string;
}

export default function LegalPage({ title, subtitle, sections, updatedAt }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <a href="/" className="flex items-center gap-1.5 group">
            <img src={kvantLogo} alt="K" className="w-8 h-8 object-contain" />
            <span className="font-bold text-lg text-slate-800 -ml-0.5 group-hover:text-indigo-600 transition-colors">vant</span>
          </a>
          <span className="text-slate-300">/</span>
          <span className="text-sm text-slate-500 truncate">{title}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 md:p-12">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">{title}</h1>
          {subtitle && <p className="text-slate-500 mb-8">{subtitle}</p>}
          {updatedAt && !subtitle && <p className="text-slate-400 text-sm mb-8">Дата обновления: {updatedAt}</p>}

          <div className="space-y-8 text-slate-700 text-sm leading-relaxed">
            {sections.map((section, i) => (
              <div key={i}>
                {section.title && (
                  <h2 className="font-bold text-slate-900 text-base mb-3 mt-6 border-b border-slate-100 pb-2">{section.title}</h2>
                )}
                <div className="space-y-3">
                  {section.content.map((block, j) => {
                    if (typeof block === "string") {
                      return <p key={j} className="text-slate-600">{block}</p>;
                    }
                    if (block.type === "list") {
                      return (
                        <ul key={j} className="list-none space-y-1.5 pl-4">
                          {block.items.map((item, k) => (
                            <li key={k} className="flex items-start gap-2 text-slate-600">
                              <span className="text-indigo-400 mt-0.5 flex-shrink-0">—</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      );
                    }
                    if (block.type === "table") {
                      return (
                        <div key={j} className="overflow-x-auto rounded-xl border border-slate-200">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                {block.headers.map((h, k) => (
                                  <th key={k} className="text-left px-4 py-3 font-semibold text-slate-700">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {block.rows.map((row, k) => (
                                <tr key={k} className={k % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                  {row.map((cell, l) => (
                                    <td key={l} className="px-4 py-3 text-slate-600 border-b border-slate-100 last:border-0">{cell}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            ))}
          </div>

          {updatedAt && subtitle && (
            <p className="text-slate-400 text-xs mt-10 pt-6 border-t border-slate-100">Дата обновления: {updatedAt}</p>
          )}
        </div>

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-indigo-600 hover:text-indigo-800 transition font-medium">
            ← Вернуться на главную
          </a>
        </div>
      </main>
    </div>
  );
}
