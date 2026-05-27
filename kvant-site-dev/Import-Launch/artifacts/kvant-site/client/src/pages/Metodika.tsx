import { Link } from "wouter";
import kvantLogo from "@assets/png_test_1778406809373.png";

export default function Metodika() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1.5">
            <img src={kvantLogo} alt="Kvant" className="h-9 w-auto object-contain" />
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm text-slate-500 truncate">Методика</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 pb-16">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 md:px-12 pt-10 pb-8 border-b border-slate-100">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase bg-emerald-50 text-emerald-700 px-3 py-1 rounded mb-5">
              Методика
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-snug mb-4">
              Как устроены занятия и почему это работает
            </h1>
            <p className="text-base text-slate-500 leading-relaxed">
              Не просто объяснение параграфа из учебника. Каждое занятие — это
              выстроенный процесс, где ученик думает сам, а не просто записывает
              за репетитором.
            </p>
          </div>

          <div className="px-8 md:px-12 py-10 space-y-12">

            {/* Section 1 */}
            <section>
              <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-2">Как проходит занятие</p>
              <h2 className="text-xl font-black text-slate-900 mb-4">Сначала — что думает сам ученик</h2>
              <div className="space-y-3 text-slate-600 leading-relaxed text-[15px]">
                <p>
                  Каждую новую тему я начинаю не с объяснения, а с вопроса: «Как ты думаешь, что такое инерция?» или «Почему, по-твоему, тело падает с ускорением?». Ученик отвечает как может — и это не проверка, а точка старта.
                </p>
                <p>
                  Потом я показываю, как есть на самом деле — и веду к правильному пониманию через диалог, аналогии из жизни и инфографику с зависимостями величин. Так материал не ложится поверх пустоты, а встраивается в то, что ученик уже думал.
                </p>
              </div>

              <div className="my-6 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl px-5 py-4 text-[15px] leading-relaxed text-slate-700 italic">
                Когда человек сначала попробовал объяснить сам — даже неверно — он в разы лучше запоминает правильный ответ. Это работает на уровне нейронауки.
              </div>

              <div className="space-y-4 mt-6">
                {[
                  {
                    n: 1,
                    title: "Спрашиваю — что ученик думает сам",
                    desc: "По любой новой теме сначала слышу версию ученика. Это показывает, где уже есть база, а где — пробел или неверное представление.",
                  },
                  {
                    n: 2,
                    title: "Объясняю через аналогии и инфографику",
                    desc: "Абстрактные формулы превращаю в конкретные образы: машина на скользкой дороге, лифт в свободном падении, пружина в руках. На онлайн-доске показываю графики зависимостей прямо в процессе разговора.",
                  },
                  {
                    n: 3,
                    title: "Теория — отдельно, задачи — отдельно",
                    desc: "Если тема большая, первое занятие целиком на понимание теории. Следующее — разбор разных типов задач. Не смешиваю, чтобы не перегружать.",
                  },
                  {
                    n: 4,
                    title: "Решаем вместе на онлайн-доске",
                    desc: "Ученик не смотрит, как я решаю — он сам пишет на общей доске, а я вижу ход его мысли и сразу корректирую там, где он свернул не туда.",
                  },
                ].map(({ n, title, desc }) => (
                  <div key={n} className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 font-black text-sm flex items-center justify-center mt-0.5">
                      {n}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-[14px] mb-0.5">{title}</p>
                      <p className="text-[13px] text-slate-500 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex gap-4 items-start bg-slate-50 border border-slate-200 rounded-xl p-4">
                <span className="text-2xl flex-shrink-0 mt-0.5">✏️</span>
                <div>
                  <p className="font-semibold text-slate-800 text-[14px] mb-1">Онлайн-доска — не просто экран</p>
                  <p className="text-[13px] text-slate-500 leading-relaxed">
                    На занятии мы оба работаем на общей интерактивной доске. Ученик решает — я вижу каждый шаг. Не «покажи ответ», а живой процесс мышления, который можно скорректировать прямо в моменте.
                  </p>
                </div>
              </div>
            </section>

            <hr className="border-slate-100" />

            {/* Section 2 */}
            <section>
              <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-2">Три формата работы</p>
              <h2 className="text-xl font-black text-slate-900 mb-5">Под каждую цель — своя система</h2>

              <div className="space-y-3">
                {/* Track 1 */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-3">
                    <span className="text-xl">📈</span>
                    <div>
                      <p className="font-semibold text-slate-800 text-[14px]">Повышение успеваемости</p>
                      <p className="text-xs text-slate-400">Текущая программа + закрытие пробелов</p>
                    </div>
                  </div>
                  <div className="px-4 py-4 space-y-2 text-[13px] text-slate-500 leading-relaxed">
                    <p>Каждое занятие начинаю с вопроса: «Что прошли на этой неделе?» — слежу за школьной программой, готовимся к контрольным и разбираем текущие темы. Но параллельно веду свой план: нахожу и закрываю пробелы в базе, которые тянутся сзади и мешают двигаться дальше. Часто оказывается, что непонимание новой темы — это просто хвост от темы трёхмесячной давности.</p>
                    <p>Ещё одна задача — показать, что физика это не скучный учебник, а логика, которая объясняет реальный мир. Когда ученик начинает это чувствовать — интерес появляется сам.</p>
                  </div>
                </div>

                {/* Track 2 */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-3">
                    <span className="text-xl">📄</span>
                    <div>
                      <p className="font-semibold text-slate-800 text-[14px]">Подготовка к ОГЭ</p>
                      <p className="text-xs text-slate-400">Системный разбор по разделам</p>
                    </div>
                  </div>
                  <div className="px-4 py-4 text-[13px] text-slate-500 leading-relaxed">
                    <p className="mb-3">Работаем по разделам, и у каждого три чёткие стадии — не перепрыгиваем вперёд, пока предыдущая не закрыта:</p>
                    <div className="space-y-2">
                      {[
                        { n: 1, label: "Теория.", text: "Полностью разбираем раздел — через диалог, аналогии и инфографику. Никакой зубрёжки, только понимание." },
                        { n: 2, label: "Опрос.", text: "После теории проверяю, реально ли материал усвоен. Один раз услышать объяснение недостаточно — физику нужно проговорить самому, иначе она не остаётся. Если что-то провалилось — возвращаемся и разбираем ещё раз." },
                        { n: 3, label: "Задачи.", text: "Только когда теория сидит — решаем все типы задач по разделу, включая вторую часть. Потом переходим к следующему." },
                      ].map(({ n, label, text }) => (
                        <div key={n} className="flex gap-2.5 items-start">
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] flex items-center justify-center mt-0.5">{n}</div>
                          <p><span className="font-medium text-slate-700">{label}</span> {text}</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3">К концу подготовки ученик закрыл всю физику — не «прошёлся по верхам», а разобрал каждый раздел полностью.</p>
                  </div>
                </div>

                {/* Track 3 */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-3">
                    <span className="text-xl">🏆</span>
                    <div>
                      <p className="font-semibold text-slate-800 text-[14px]">Олимпиады</p>
                      <p className="text-xs text-slate-400">Нестандартное мышление</p>
                    </div>
                  </div>
                  <div className="px-4 py-4 text-[13px] text-slate-500 leading-relaxed">
                    <p>Олимпиадная физика — это не учебник, а умение думать нестандартно. Разбираем задачи, где нет шаблона, учимся строить решение с нуля, работаем над физической интуицией. Для тех, кому мало школьной программы.</p>
                  </div>
                </div>
              </div>
            </section>

            <hr className="border-slate-100" />

            {/* Section 3 */}
            <section>
              <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-2">Проблема рынка</p>
              <h2 className="text-xl font-black text-slate-900 mb-4">Массовые курсы и вебинары — не работают для большинства</h2>
              <div className="space-y-3 text-slate-600 leading-relaxed text-[15px]">
                <p>Помимо репетиторов, сегодня у родителей есть соблазн купить онлайн-курс. Там 200 лекций, PDF и чат, где преподаватель отвечает раз в три дня. Ученик платит деньги — и оказывается один на один с горой контента без живого человека рядом.</p>
                <p>Когда ты один из трёхсот в потоке — тебя просто нет. Никто не заметит, что ты не понял тему. Никто не объяснит по-другому именно тебе.</p>
                <p>Я работаю только один на один. Слышу конкретного ученика, вижу где затык — и остаюсь там, сколько нужно.</p>
              </div>
            </section>

            <hr className="border-slate-100" />

            {/* Section 4 */}
            <section>
              <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-2">Почему выбирают меня</p>
              <h2 className="text-xl font-black text-slate-900 mb-4">Молодой репетитор — это не риск, а преимущество</h2>
              <div className="space-y-3 text-slate-600 leading-relaxed text-[15px] mb-6">
                <p>Рынок репетиторов переполнен специалистами 40–60 лет. Но «опытный» не всегда значит «эффективный» для подростка. Опытный репетитор давно забыл, как это — смотреть на формулу и не понимать вообще ничего. Я — помню.</p>
                <p>Я недавно сам сидел над этими задачами. Знаю, где именно застревают, говорю на одном языке с учеником и создаю атмосферу, в которой не стыдно сказать «я не понял — объясни ещё раз».</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-3">🎓 Взрослый репетитор</p>
                  <ul className="space-y-1.5 text-[13px] text-red-900">
                    {[
                      "Ученик стесняется переспросить",
                      "Объясняет через «это же очевидно»",
                      "Формальная дистанция, напряжение",
                      "Ребёнок зажат, не раскрывается",
                      "Занятие как обязанность",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-red-300 mt-0.5">—</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-3">⚡ Молодой репетитор — я</p>
                  <ul className="space-y-1.5 text-[13px] text-emerald-900">
                    {[
                      "Переспросить нормально и не стыдно",
                      "Объясняю там, где реально непонятно",
                      "Дружеская атмосфера без барьера",
                      "Ученик открыт, задаёт вопросы",
                      "Занятие как разговор с умным другом",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-0.5">—</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <hr className="border-slate-100" />

            {/* Section 5 */}
            <section>
              <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-2">Итог</p>
              <h2 className="text-xl font-black text-slate-900 mb-4">Физика — это не для избранных. Просто важно с кем</h2>
              <div className="space-y-3 text-slate-600 leading-relaxed text-[15px]">
                <p>Большинство учеников приходят с убеждением «физика — не моё». Через несколько занятий это уходит. Не потому что я хвалю авансом, а потому что ребёнок начинает решать задачи сам — и чувствует это.</p>
                <p>Молодой репетитор — это не тот, кто «ещё мало знает». Это тот, кто помнит как учиться, говорит на одном языке с учеником и создаёт атмосферу, в которой учиться не страшно.</p>
              </div>
            </section>

            {/* Big Quote */}
            <div className="text-center py-6">
              <p className="text-xl md:text-2xl font-black text-slate-900 leading-snug mb-2">
                «Не бывает детей без способностей.<br />
                Бывает объяснение, которое не попало в точку.»
              </p>
              <p className="text-sm text-slate-400">Именно это я говорю каждому новому ученику на первом занятии.</p>
            </div>

            {/* Author */}
            <div className="flex items-center gap-4 bg-slate-50 rounded-xl border border-slate-200 p-4">
              <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 font-black text-lg flex items-center justify-center flex-shrink-0">
                К
              </div>
              <div>
                <p className="font-semibold text-slate-800">Кирилл</p>
                <p className="text-sm text-slate-400">Репетитор по физике · Kvant · ОГЭ, олимпиады, успеваемость</p>
              </div>
            </div>

            {/* CTA */}
            <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 p-8 text-center">
              <p className="text-lg font-black text-indigo-900 mb-2">Хочешь попробовать?</p>
              <p className="text-sm text-indigo-700 leading-relaxed mb-6">
                Первое занятие — знакомство без обязательств.<br />
                Просто поговорим и поймём, подходим ли друг другу.
              </p>
              <Link
                href="/#contact"
                className="inline-block bg-gradient-to-r from-[#4F46E5] to-[#2563EB] hover:opacity-90 transition-opacity text-white font-semibold rounded-xl px-8 py-3 text-[15px]"
              >
                Записаться на пробное занятие →
              </Link>
            </div>

          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-800 transition font-medium">
            ← Вернуться на главную
          </Link>
        </div>
      </main>
    </div>
  );
}
