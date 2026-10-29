# Internal page renderer audit

Reference commit: b89eea53ec1e78a117718356d319aff3ac837b7f

147 upstream page files; 299 registered module views. 211 use dedicated experiences, 9 use shared interaction components, 79 remain schema-based.

A dedicated renderer is not a claim of backend parity. Shared CRUD can be suitable for a resource page, but entries below require individual design review before calling the entire product complete. Admin user details use a separate ID-scoped page; unknown IDs have an explicit not-found state.

| Module | View | Renderer | Route |
|---|---|---|---|
| crm | مسیر فروش | dedicated | /crm |
| crm | مخاطبان | dedicated | /crm?tab=contacts |
| crm | اتوماسیون | dedicated | /crm?tab=automation |
| crm | دستیار فروش | dedicated | /crm?tab=agent |
| crm | تقویم تیم | dedicated | /crm?tab=calendar |
| crm | تحلیل فروش | dedicated | /crm?tab=analytics |
| crm | محصولات | dedicated | /crm?tab=products |
| crm | فاکتورها | dedicated | /crm?tab=invoices |
| crm | قراردادها | dedicated | /crm?tab=contracts |
| crm | پروژه‌ها | dedicated | /crm?tab=projects |
| crm | ملک‌ها | dedicated | /crm?tab=properties |
| crm | مالکین | dedicated | /crm?tab=owners |
| crm | بازدیدها | dedicated | /crm?tab=viewings |
| crm | تطبیق خریدار و ملک | dedicated | /crm?tab=matches |
| crm | عملکرد مشاوران | dedicated | /crm?tab=performance |
| social | حساب و انتشار | dedicated | /social |
| social | ساخت محتوا | dedicated | /social?tab=content |
| social | آمار و رشد | dedicated | /social?tab=analytics |
| social | صندوق پیام | shared interaction | /social?tab=messages |
| social | کامنت به دایرکت | dedicated | /social?tab=campaigns |
| social | پاسخ خودکار دایرکت | dedicated | /social?tab=direct-rules |
| social | هویت برند | dedicated | /social?tab=brand |
| social | رقبای من | dedicated | /social?tab=competitors |
| social | تقویم محتوا | dedicated | /social?tab=calendar |
| social | صف انتشار | dedicated | /social?tab=queue |
| social | گزارش رشد هوشمند | dedicated | /social?tab=growth-report |
| social | اتصال و وبهوک | shared interaction | /social?tab=connections |
| seo | نمای کلی | dedicated | /seo |
| seo | بررسی نشانی | dedicated | /seo?tab=url |
| seo | پژوهش کلیدواژه | dedicated | /seo?tab=keyword |
| seo | نویسنده محتوا | dedicated | /seo?tab=content |
| seo | عنوان و متا | dedicated | /seo?tab=meta |
| seo | وب‌سایت‌های من | dedicated | /seo?tab=sites |
| seo | داده و رقابت | dedicated | /seo?tab=intelligence |
| seo | پایش رتبه | dedicated | /seo?tab=rankings |
| seo | بک‌لینک‌ها | dedicated | /seo?tab=backlinks |
| seo | رقبای جستجو | dedicated | /seo?tab=competitors |
| seo | تیم محتوای سئو | dedicated | /seo?tab=agent-pipeline |
| seo | حافظه و درس‌ها | dedicated | /seo?tab=lessons |
| seo | کتابخانه محتوا | dedicated | /seo?tab=posts |
| seo | برنامه تولید محتوا | dedicated | /seo?tab=plan |
| seo | اتصال وردپرس | shared interaction | /seo?tab=wordpress |
| seo | کنسول جستجوی گوگل | shared interaction | /seo?tab=search-console |
| seo | تأیید مالکیت سایت | dedicated | /seo?tab=verify |
| accounting | نمای مالی | dedicated | /accounting |
| accounting | اسناد و آرتیکل‌ها | dedicated | /accounting?tab=journal |
| accounting | دفتر حساب‌ها | dedicated | /accounting?tab=accounts |
| accounting | کدینگ، بودجه و مالیات | dedicated | /accounting?tab=ledger-setup |
| accounting | هزینه‌ها و تأمین‌کنندگان | dedicated | /accounting?tab=expenses |
| accounting | بانک و تطبیق | dedicated | /accounting?tab=bank |
| accounting | حقوق و دستمزد | dedicated | /accounting?tab=payroll |
| accounting | تسویه با مالک | dedicated | /accounting?tab=owner-statements |
| accounting | بستن دورهٔ مالی | dedicated | /accounting?tab=close-period |
| accounting | دستیار مالی | dedicated | /accounting?tab=assistant |
| accounting | گزارش خودکار و خروجی | dedicated | /accounting?tab=automation |
| accounting | بودجه‌بندی | dedicated | /accounting?tab=budgets |
| accounting | مالیات و ارزش افزوده | dedicated | /accounting?tab=tax |
| leads | نمای جذب | dedicated | /lead-gen |
| leads | فرم‌های جذب | dedicated | /lead-gen?tab=forms |
| leads | منابع و کانال‌ها | dedicated | /lead-gen?tab=sources |
| leads | صندوق سرنخ‌ها | dedicated | /lead-gen?tab=inbox |
| leads | تبدیل بر اساس کانال | dedicated | /lead-gen?tab=reports |
| leads | سازندهٔ فرم | dedicated | /lead-gen?tab=builder |
| leads | اتصال‌های تبلیغاتی | shared interaction | /lead-gen?tab=connectors |
| voice-agent | منشی‌ها | dedicated | /voice-agent |
| voice-agent | راه‌اندازی منشی | dedicated | /voice-agent?tab=setup |
| voice-agent | دانش منشی | dedicated | /voice-agent?tab=knowledge |
| voice-agent | فایل‌های املاک | dedicated | /voice-agent?tab=properties |
| voice-agent | گزارش تماس‌ها | dedicated | /voice-agent?tab=calls |
| voice-agent | قرارهای ثبت‌شده | dedicated | /voice-agent?tab=appointments |
| voice-agent | شماره‌ها و اتصال | shared interaction | /voice-agent?tab=numbers |
| doctor | ارزیابی کسب‌وکار | dedicated | /business-doctor |
| doctor | قوت‌ها و فرصت‌ها | dedicated | /business-doctor?tab=swot |
| doctor | برنامهٔ اقدام | dedicated | /business-doctor?tab=action-plan |
| doctor | شاخص‌های پیشنهادی | dedicated | /business-doctor?tab=kpis |
| doctor | ارزیابی‌های قبلی | dedicated | /business-doctor?tab=history |
| ceo | مشاور استراتژیک | dedicated | /ceo |
| ceo | هماهنگ‌کنندهٔ تیم | dedicated | /ceo?tab=orchestrator |
| ceo | هدف‌های من | dedicated | /ceo?tab=goals |
| ceo | اقدام‌های منتظر تأیید | dedicated | /ceo?tab=approvals |
| ceo | حافظهٔ کسب‌وکار | dedicated | /ceo?tab=memory |
| ceo | دانش کسب‌وکار | dedicated | /ceo?tab=knowledge |
| agents | اعضای تیم | dedicated | /agents |
| agents | دستیاران صنفی | dedicated | /agents?tab=industry |
| agents | گزارش اجراها | dedicated | /agents?tab=runs |
| agents | ساخت دستیار | dedicated | /agents?tab=create |
| meeting | جلسهٔ تازه | dedicated | /meeting |
| meeting | جلسات من | dedicated | /meeting?tab=history |
| website | وب‌سایت‌های من | dedicated | /website-designer |
| website | شرح پروژه | dedicated | /website-designer?tab=brief |
| website | پیش‌نمایش و بخش‌ها | dedicated | /website-designer?tab=preview |
| website | کد و دریافت فایل | dedicated | /website-designer?tab=code |
| startup | ایده و مسئله | dedicated | /startup/builder |
| startup | بوم ناب | dedicated | /startup/builder?tab=canvas |
| startup | مسیر محصول اولیه | dedicated | /startup/builder?tab=mvp |
| startup | ارائهٔ سرمایه‌گذار | dedicated | /startup/builder?tab=pitch |
| startup | ارتباط با تیم متخصص | dedicated | /startup/builder?tab=contact |
| startup | پروژه‌های من | dedicated | /startup/builder?tab=projects |
| organization | هویت کسب‌وکار | dedicated | /organization/onboarding |
| organization | کسب‌وکارهای من | dedicated | /organization/onboarding?tab=workspaces |
| organization | اعضای تیم | dedicated | /organization/onboarding?tab=members |
| organization | دعوت همکاران | dedicated | /organization/onboarding?tab=invites |
| organization | نقش‌ها و دسترسی | dedicated | /organization/onboarding?tab=roles |
| organization | ماژول‌های فعال | dedicated | /organization/onboarding?tab=modules |
| organization | رویدادهای تیم | dedicated | /organization/onboarding?tab=audit |
| student | نمای کلی | dedicated | /student |
| student | درس‌های من | dedicated | /student?view=courses |
| student | جزوه و منابع | dedicated | /student?view=upload |
| student | یادداشت‌ها | dedicated | /student?view=notes |
| student | تمرین و آزمون | dedicated | /student?view=practice |
| student | فلش‌کارت و مرور | dedicated | /student?view=review |
| student | برنامه و امتحان‌ها | dedicated | /student?view=planner |
| student | گروه‌های مطالعه | dedicated | /student?view=groups |
| student | گزارش مطالعه و زمان‌سنج | dedicated | /student?view=reports |
| student | دستیار پایان‌نامه | dedicated | /student?view=thesis |
| student | دستیار تکلیف | dedicated | /student?view=assignment |
| student | پروفایل دانشجو | dedicated | /student?view=profile |
| student | کسب‌وکار دانشجویی | dedicated | /student?view=business |
| student | گفتگو با مدرس | dedicated | /student?view=chat |
| student | مسیر یادگیری | dedicated | /student?view=path |
| learn | کشف دوره‌ها | dedicated | /learn |
| learn | درس و تمرین | dedicated | /learn?tab=lesson |
| learn | مسیرهای یادگیری | dedicated | /learn?tab=paths |
| learn | دستیار درس | dedicated | /learn?tab=tutor |
| learn | یادداشت‌های درس | dedicated | /learn?tab=notes |
| learn | آزمون پایانی | dedicated | /learn?tab=assessment |
| learn | گواهی‌ها و دستاوردها | dedicated | /learn?tab=certificates |
| learn | پروفایل تحصیلی | dedicated | /learn?tab=profile |
| fitness | نمای کلی | dedicated | /fitness |
| fitness | مربی‌ها | dedicated | /fitness?tab=trainers |
| fitness | برنامه‌های تمرین | dedicated | /fitness?tab=programs |
| fitness | حالت باشگاه | dedicated | /fitness?tab=gym |
| fitness | تغذیه و یادداشت روزانه | dedicated | /fitness?tab=nutrition |
| fitness | تاریخچهٔ تمرین | dedicated | /fitness?tab=history |
| fitness | پروفایل ورزشی | dedicated | /fitness?tab=profile |
| fitness | گزارش پیشرفت | dedicated | /fitness?tab=reports |
| fitness | عضویت فیتنس | dedicated | /fitness?tab=plans |
| fitness | کارت ورزشکار | dedicated | /fitness?tab=athlete-card |
| marketplace | مربیان | dedicated | /fitness/marketplace |
| marketplace | فروشگاه برنامه‌ها | dedicated | /fitness/marketplace?tab=store |
| marketplace | وقت‌های مشاوره | dedicated | /fitness/marketplace?tab=slots |
| marketplace | سفارش‌های من | dedicated | /fitness/marketplace?tab=orders |
| marketplace | درخواست مربیگری | dedicated | /fitness/marketplace?tab=apply |
| marketplace | پنل فروشنده | dedicated | /fitness/marketplace?tab=seller |
| marketplace | نظرهای تأییدشده | dedicated | /fitness/marketplace?tab=reviews |
| image | ساخت تصویر | dedicated | /image/generate |
| image | تصویر مرجع | dedicated | /image/generate?tab=reference |
| image | طراحی شخصیت | dedicated | /image/generate?tab=characters |
| image | گالری تصاویر | dedicated | /image/generate?tab=gallery |
| video | ساخت ویدیو | dedicated | /video/generate |
| video | تصویر به ویدیو | dedicated | /video/generate?tab=reference |
| video | ویدیوهای من | dedicated | /video/generate?tab=history |
| music | ساخت موسیقی | dedicated | /music/generate |
| music | ترانه و بی‌کلام | dedicated | /music/generate?tab=lyrics |
| music | آهنگ‌های من | dedicated | /music/generate?tab=history |
| voice | متن و بخش‌بندی | dedicated | /voice-studio |
| voice | کتابخانه صدا | dedicated | /voice-studio?tab=voice |
| voice | ساخت و شنیدن | dedicated | /voice-studio?tab=generate |
| voice | پروژه‌های صوتی | dedicated | /voice-studio?tab=projects |
| voice | تنظیمات ذخیره‌شده | dedicated | /voice-studio?tab=presets |
| voice | فایل‌های صوتی | dedicated | /voice-studio?tab=history |
| voice | بایگانی | dedicated | /voice-studio?tab=archive |
| factory | پروژه‌های من | dedicated | /video-factory |
| factory | تولید فصل‌به‌فصل | dedicated | /video-factory?tab=production |
| factory | ایده و منابع | dedicated | /video-factory?tab=ideas |
| factory | متن و استوری‌بورد | dedicated | /video-factory?tab=script |
| factory | شخصیت و پیوستگی | dedicated | /video-factory?tab=characters |
| factory | تایم‌لاین | dedicated | /video-factory?tab=timeline |
| factory | ویرایش نماها | dedicated | /video-factory?tab=edit |
| factory | کتابخانهٔ دارایی‌ها | dedicated | /video-factory?tab=library |
| factory | خروجی‌ها | dedicated | /video-factory?tab=assets |
| factory | انتشار و زمان‌بندی | dedicated | /video-factory?tab=publishing |
| factory | صدا و کیفیت | dedicated | /video-factory?tab=advanced |
| factory | نسخه‌ها و بازگردانی | dedicated | /video-factory?tab=history |
| factory | پکیج‌های تولید | dedicated | /video-factory?tab=packages |
| play | بازی‌ها | dedicated | /play |
| play | پروفایل بازی من | dedicated | /play?tab=profile |
| play | رتبه‌بندی | dedicated | /play?tab=rankings |
| play | تاریخچه من | dedicated | /play?tab=history |
| play | دستاوردها | dedicated | /play?tab=achievements |
| play | مسابقه‌ها و پاداش‌ها | dedicated | /play?tab=competitions |
| referral | دعوت دوستان | dedicated | /referral |
| referral | آمار دعوت‌ها | dedicated | /referral?tab=stats |
| referral | کیف پول درآمد | dedicated | /referral?tab=wallet |
| referral | تراکنش‌ها | dedicated | /referral?tab=transactions |
| referral | درخواست برداشت | dedicated | /referral?tab=payout |
| owner | گزارش‌های تسویه | dedicated | /owner |
| owner | ملک‌های من | dedicated | /owner?tab=properties |
| owner | تقویم رزروها | dedicated | /owner?tab=bookings |
| admin-dashboard | داشبورد مدیریت | dedicated | /admin/dashboard |
| admin-dashboard | کاربران | schema-based | /admin/dashboard?tab=user |
| admin-dashboard | سوابق مصرف | schema-based | /admin/dashboard?tab=usage-log |
| admin-users | کاربران | dedicated | /admin/users |
| admin-users-[id] | پروندهٔ کاربر | dedicated | /admin/users/[id] |
| admin-users-[id] | Payment | dedicated | /admin/users/[id]?tab=payment |
| admin-users-[id] | تراکنش‌های کیف پول | dedicated | /admin/users/[id]?tab=wallet-transaction |
| admin-users-[id] | Conversation | dedicated | /admin/users/[id]?tab=conversation |
| admin-users-[id] | Organization Member | dedicated | /admin/users/[id]?tab=organization-member |
| admin-users-[id] | پروفایل‌های تحصیلی | dedicated | /admin/users/[id]?tab=student-academic-profile |
| admin-users-[id] | Fitness Profile | dedicated | /admin/users/[id]?tab=fitness-profile |
| admin-admins | مدیران و دسترسی | shared interaction | /admin/admins |
| admin-crm | CRM کسب‌وکارها | schema-based | /admin/crm |
| admin-crm | فرصت‌های فروش | schema-based | /admin/crm?tab=crm-deal |
| admin-crm | فضاهای کسب‌وکار | schema-based | /admin/crm?tab=business-workspace |
| admin-companies | شرکت‌ها | schema-based | /admin/companies |
| admin-financial | خریدها و فاکتورها | dedicated | /admin/financial |
| admin-financial-customers | حساب خریداران | dedicated | /admin/financial/customers |
| admin-financial-customers | طرح‌ها و قیمت‌ها | dedicated | /admin/financial/customers?tab=package |
| admin-financial-invoices-[id] | فاکتور خرید | dedicated | /admin/financial/invoices/[id] |
| admin-packages | پکیج‌ها و قیمت‌گذاری | dedicated | /admin/packages |
| admin-subscriptions | اشتراک‌ها | dedicated | /admin/subscriptions |
| admin-subscriptions | بسته‌های صنعتی | dedicated | /admin/subscriptions?tab=industry-pack |
| admin-credit-tiers | بسته‌های اعتبار | dedicated | /admin/credit-tiers |
| admin-billing-rates | ارز و نرخ‌ها | dedicated | /admin/billing/rates |
| admin-billing-promotions | پروموشن‌ها | dedicated | /admin/billing/promotions |
| admin-billing-promotions | Billing Promotion Redemption | dedicated | /admin/billing/promotions?tab=billing-promotion-redemption |
| admin-revenue | درآمد و فروش | dedicated | /admin/revenue |
| admin-affiliate | همکاری و کیف پول | schema-based | /admin/affiliate |
| admin-affiliate | تراکنش‌های کیف پول | schema-based | /admin/affiliate?tab=wallet-transaction |
| admin-referrals | کد دعوت و اینفلوئنسر | schema-based | /admin/referrals |
| admin-referrals | دعوت‌نامه‌ها | schema-based | /admin/referrals?tab=invite-card |
| admin-invites | سازندهٔ دعوت‌نامه | schema-based | /admin/invites |
| admin-invites-manage | مدیریت دعوت‌نامه‌ها | schema-based | /admin/invites/manage |
| admin-industry-packs | بسته‌های صنعتی | dedicated | /admin/industry-packs |
| admin-categories | دسته‌های کسب‌وکار | schema-based | /admin/categories |
| admin-modules | ثبت و تنظیم ماژول‌ها | schema-based | /admin/modules |
| admin-module-access | دسترسی بسته و مشتری | shared interaction | /admin/module-access |
| admin-module-access | استثناهای دسترسی کاربران | schema-based | /admin/module-access?tab=user-module-override |
| admin-tools | ابزارها و دستیارها | schema-based | /admin/tools |
| admin-tools | پرامپت‌ها | schema-based | /admin/tools?tab=prompt |
| admin-llm | مدیریت API و مسیریابی | schema-based | /admin/llm |
| admin-llm | مدل‌های زبانی | schema-based | /admin/llm?tab=llm-model |
| admin-models | تعرفه و مدل‌های AI | schema-based | /admin/models |
| admin-provider-fallback | رویدادهای جایگزینی | schema-based | /admin/provider-fallback |
| admin-usage | مصرف و اقتصاد واحد | schema-based | /admin/usage |
| admin-usage | تعرفهٔ مدل‌ها | schema-based | /admin/usage?tab=ai-model-pricing |
| admin-analytics | تحلیل امکانات | schema-based | /admin/analytics |
| admin-analytics | بازدیدهای صفحات عمومی | schema-based | /admin/analytics?tab=public-page-visit |
| admin-prompts | کتابخانه پرامپت | schema-based | /admin/prompts |
| admin-ai-chat | سیاست‌های چت و کشف | schema-based | /admin/ai-chat |
| admin-ai-chat | تنظیمات کشف محتوا | schema-based | /admin/ai-chat?tab=ai-chat-discovery-preference |
| admin-chats | بازبینی گفتگوها | schema-based | /admin/chats |
| admin-chats | پیام‌ها | schema-based | /admin/chats?tab=message |
| admin-public-share | گالری و لینک‌های عمومی | schema-based | /admin/public-share |
| admin-public-share | تصاویر تولیدشده | schema-based | /admin/public-share?tab=generated-image |
| admin-student | فضای دانشجویی | schema-based | /admin/student |
| admin-student | منابع درسی | schema-based | /admin/student?tab=student-material |
| admin-student | جلسه‌های مطالعه | schema-based | /admin/student?tab=student-study-session |
| admin-academy | مدیریت آکادمی | dedicated | /admin/academy |
| admin-academy | رشته‌های تحصیلی | schema-based | /admin/academy?tab=academic-major |
| admin-academy | پروفایل‌های تحصیلی | schema-based | /admin/academy?tab=student-academic-profile |
| admin-academy | گواهی‌های دوره | schema-based | /admin/academy?tab=ai-course-certificate |
| admin-academy | مسیرهای یادگیری | schema-based | /admin/academy?tab=academy-learning-path |
| admin-ai-courses | تولید و ویرایش دوره | dedicated | /admin/ai-courses |
| admin-ai-courses | صف تولید دوره | dedicated | /admin/ai-courses?tab=ai-course-generation-job |
| admin-ai-courses | نسخه‌های دوره | dedicated | /admin/ai-courses?tab=ai-course-revision |
| admin-ai-courses-[id]-preview | پیش‌نمایش دوره | dedicated | /admin/ai-courses/[id]/preview |
| admin-fitness | مدیریت فیتنس | schema-based | /admin/fitness |
| admin-fitness | مربیان | schema-based | /admin/fitness?tab=fitness-trainer |
| admin-fitness | برنامه‌های ورزشی | schema-based | /admin/fitness?tab=fitness-program |
| admin-fitness-users | اعضا و دسترسی ورزشی | schema-based | /admin/fitness/users |
| admin-fitness-users | کاربران | schema-based | /admin/fitness/users?tab=user |
| admin-fitness-marketplace | بازار مربیان و سفارش‌ها | dedicated | /admin/fitness/marketplace |
| admin-fitness-marketplace | محصولات مربیان | schema-based | /admin/fitness/marketplace?tab=fitness-product |
| admin-fitness-marketplace | سفارش‌های بازار | schema-based | /admin/fitness/marketplace?tab=fitness-market-order |
| admin-fitness-marketplace | دفتر فروشندگان | schema-based | /admin/fitness/marketplace?tab=fitness-seller-ledger |
| admin-fitness-marketplace | بازخوردهای خرید | schema-based | /admin/fitness/marketplace?tab=fitness-verified-review |
| admin-video-factory | مرکز عملیات تولید ویدیو | schema-based | /admin/video-factory |
| admin-video-factory | تأمین‌کنندگان تولید | schema-based | /admin/video-factory?tab=video-factory-provider |
| admin-video-factory | منابع تولید | schema-based | /admin/video-factory?tab=video-factory-resource |
| admin-video-factory | سهمیه‌های ذخیره‌سازی | schema-based | /admin/video-factory?tab=video-factory-storage-quota |
| admin-video-factory | گزارش‌های کیفیت | schema-based | /admin/video-factory?tab=video-factory-quality-report |
| admin-video-factory | تأییدیه‌های تولید | schema-based | /admin/video-factory?tab=video-factory-approval |
| admin-video-factory | دارایی‌های تولید | schema-based | /admin/video-factory?tab=video-factory-asset |
| admin-video-factory | نسخه‌های پیکربندی | schema-based | /admin/video-factory?tab=video-factory-config-version |
| admin-voice-studio | مدیریت استودیوی صدا | schema-based | /admin/voice-studio |
| admin-voice-studio | تعرفهٔ مدل‌ها | schema-based | /admin/voice-studio?tab=ai-model-pricing |
| admin-voice-studio | پروژه‌های صدا | schema-based | /admin/voice-studio?tab=voice-studio-project |
| admin-voice-agent | مدیریت مرکز تماس | schema-based | /admin/voice-agent |
| admin-voice-agent | سوابق تماس | schema-based | /admin/voice-agent?tab=voice-call-log |
| admin-voice-agent | قرارهای تماس | schema-based | /admin/voice-agent?tab=voice-appointment |
| admin-seo-intelligence | تعرفه و پژوهش سئو | schema-based | /admin/seo-intelligence |
| admin-seo-intelligence | وب‌سایت‌های سئو | schema-based | /admin/seo-intelligence?tab=seo-site |
| admin-lead-connectors | اتصال‌های تبلیغاتی | schema-based | /admin/lead-connectors |
| admin-generated-websites | وب‌سایت‌های تولیدشده | schema-based | /admin/generated-websites |
| admin-play | مدیریت زمین بازی | schema-based | /admin/play |
| admin-play | پروفایل بازیکنان | schema-based | /admin/play?tab=play-profile |
| admin-play | چالش‌ها و مسابقه‌ها | schema-based | /admin/play?tab=play-tournament |
| admin-play | پرسش‌های بازی | schema-based | /admin/play?tab=play-question |
| admin-play | جلسه‌های بازی | schema-based | /admin/play?tab=play-session |
| admin-games | بازی‌ها و بانک سؤال | schema-based | /admin/games |
| admin-games | بانک پرسش‌ها | schema-based | /admin/games?tab=game-question |
| admin-games | سوابق بازی | schema-based | /admin/games?tab=game-session |
| admin-startup-inquiries | درخواست‌های استارتاپ | schema-based | /admin/startup-inquiries |
| admin-settings | هویت و تنظیمات سایت | schema-based | /admin/settings |
| admin-cloudflare | زیرساخت و Workers AI | shared interaction | /admin/cloudflare |
| admin-system | سلامت سیستم | schema-based | /admin/system |
| admin-logs | لاگ و رویدادها | schema-based | /admin/logs |
| admin-logs | سوابق تغییرات | schema-based | /admin/logs?tab=audit-log |