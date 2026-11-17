import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';

export type AppLanguage = 'en' | 'ar';

const ARABIC_TRANSLATIONS: Readonly<Record<string, string>> = {
  'Task Manager': 'مدير المهام',
  'Search tasks...': 'ابحث عن المهام...',
  'Search tasks': 'ابحث عن المهام',
  'Search by title or description…': 'ابحث بالعنوان أو الوصف…',
  'Search by name, email, or role': 'ابحث بالاسم أو البريد الإلكتروني أو الدور',
  Dashboard: 'لوحة المعلومات',
  Tasks: 'المهام',
  Calendar: 'التقويم',
  Analytics: 'التحليلات',
  Team: 'الفريق',
  Settings: 'الإعدادات',
  'Main Navigation': 'التنقل الرئيسي',
  'Create new task': 'إنشاء مهمة جديدة',
  'New Task': 'مهمة جديدة',
  'Skip to main content': 'انتقل إلى المحتوى الرئيسي',
  'View recent activity': 'عرض النشاط الأخير',
  'Task dashboard': 'لوحة المهام',
  'Task Statistics': 'إحصائيات المهام',
  'Filters and Actions': 'عوامل التصفية والإجراءات',
  'Filter tasks by status': 'تصفية المهام حسب الحالة',
  All: 'الكل',
  'To Do': 'قيد الانتظار',
  'In Progress': 'قيد التنفيذ',
  Done: 'مكتمل',
  Priority: 'الأولوية',
  'All Priorities': 'كل الأولويات',
  High: 'عالية',
  Medium: 'متوسطة',
  Low: 'منخفضة',
  Activity: 'النشاط',
  'Toggle Recent Activity Feed': 'تبديل موجز النشاط الأخير',
  'TO DO': 'قيد الانتظار',
  'IN PROGRESS': 'قيد التنفيذ',
  DONE: 'مكتمل',
  'No tasks to do': 'لا توجد مهام قيد الانتظار',
  'No tasks in progress': 'لا توجد مهام قيد التنفيذ',
  'No completed tasks': 'لا توجد مهام مكتملة',
  'No tasks': 'لا توجد مهام',
  'Kanban Task Board': 'لوحة المهام',
  'Drag to reorder or change status': 'اسحب لإعادة الترتيب أو لتغيير الحالة',
  'All Statuses': 'كل الحالات',
  Status: 'الحالة',
  'Filter by status': 'تصفية حسب الحالة',
  'Filter by priority': 'تصفية حسب الأولوية',
  'Clear search': 'مسح البحث',
  'Reset all filters': 'إعادة تعيين كل عوامل التصفية',
  Reset: 'إعادة تعيين',
  'Edit Task': 'تعديل المهمة',
  'Create New Task': 'إنشاء مهمة جديدة',
  'Task Title': 'عنوان المهمة',
  'e.g. Design new homepage layout': 'مثال: تصميم تخطيط الصفحة الرئيسية',
  'Title is required': 'عنوان المهمة مطلوب',
  'Title must be at least 3 characters': 'يجب ألا يقل العنوان عن 3 أحرف',
  Description: 'الوصف',
  'Brief description of the task...': 'وصف موجز للمهمة...',
  'Due Date': 'تاريخ الاستحقاق',
  'Due date is required': 'تاريخ الاستحقاق مطلوب',
  Assignee: 'المسؤول',
  'Assignee is required': 'المسؤول مطلوب',
  'Tags (comma separated)': 'الوسوم (مفصولة بفواصل)',
  'e.g. Design, Frontend, UI': 'مثال: تصميم، واجهة أمامية، واجهة مستخدم',
  Cancel: 'إلغاء',
  'Save Changes': 'حفظ التغييرات',
  'Create Task': 'إنشاء المهمة',
  Edit: 'تعديل',
  Delete: 'حذف',
  'Move earlier': 'نقل إلى الأعلى',
  'Move later': 'نقل إلى الأسفل',
  People: 'الأشخاص',
  'Manage your team and assign work to the right people.':
    'أدر فريقك وأسند العمل إلى الأشخاص المناسبين.',
  'Product Designer': 'مصمم منتجات',
  'Frontend Developer': 'مطوّر واجهات أمامية',
  'Backend Developer': 'مطوّر واجهات خلفية',
  'QA Engineer': 'مهندس ضمان الجودة',
  members: 'أعضاء',
  'Search team members': 'ابحث عن أعضاء الفريق',
  'No team members found': 'لم يتم العثور على أعضاء الفريق',
  'Try a different name, email, or role.': 'جرّب اسمًا أو بريدًا إلكترونيًا أو دورًا آخر.',
  'Task workload': 'عبء المهام',
  Open: 'مفتوحة',
  Completed: 'مكتملة',
  'Total tasks': 'إجمالي المهام',
  'Same as yesterday': 'مثل الأمس',
  '+12 this week': '+12 هذا الأسبوع',
  '+8 today': '+8 اليوم',
  '+3 today': '+3 اليوم',
  'Assign a task': 'إسناد مهمة',
  'Assign task': 'إسناد مهمة',
  'No task data to display yet.': 'لا توجد بيانات مهام لعرضها حتى الآن.',
  'Total Tasks': 'إجمالي المهام',
  Overdue: 'متأخرة',
  'Completion Rate': 'معدل الإنجاز',
  'Status Distribution': 'توزيع الحالات',
  'Priority Distribution': 'توزيع الأولويات',
  'Tasks by Assignee': 'المهام حسب المسؤول',
  'Tasks Completed — Last 7 Days': 'المهام المكتملة — آخر 7 أيام',
  'Recent Activity': 'النشاط الأخير',
  'Recent Activity Feed': 'موجز النشاط الأخير',
  activities: 'أنشطة',
  Created: 'تم الإنشاء',
  Assigned: 'تم الإسناد',
  Updated: 'تم التحديث',
  Deleted: 'تم الحذف',
  'Clear activity history': 'مسح سجل النشاط',
  'Close activity feed': 'إغلاق موجز النشاط',
  'Filter activities by action': 'تصفية الأنشطة حسب الإجراء',
  'No recent activity': 'لا يوجد نشاط حديث',
  'Task creations, status updates, and edits will appear here in real time.':
    'ستظهر هنا عمليات إنشاء المهام وتحديث الحالات والتعديلات مباشرةً.',
  'No matching activity': 'لا توجد أنشطة مطابقة',
  'There are no activities matching the "{{filter}}" filter.':
    'لا توجد أنشطة تطابق عامل التصفية "{{filter}}".',
  'Show all activities': 'عرض كل الأنشطة',
  'View task': 'عرض المهمة',
  'Retry the failed request': 'إعادة محاولة الطلب الفاشل',
  'Retrying…': 'جارٍ إعادة المحاولة…',
  Retry: 'إعادة المحاولة',
  'Dismiss error': 'إغلاق رسالة الخطأ',
  'Confirm Action': 'تأكيد الإجراء',
  'Are you sure you want to proceed?': 'هل أنت متأكد من المتابعة؟',
  Loading: 'جارٍ التحميل',
  'Loading…': 'جارٍ التحميل…',
  'Loading kanban board': 'جارٍ تحميل لوحة المهام',
  'Due today': 'تستحق اليوم',
  'Overdue by {count} day': 'متأخرة يومًا واحدًا',
  'Overdue by {count} days': 'متأخرة {count} أيام',
  'Due in {count} day': 'تستحق خلال يوم واحد',
  'Due in {count} days': 'تستحق خلال {count} أيام',
  'Just now': 'الآن',
  Yesterday: 'أمس',
  Unknown: 'غير معروف',
  HIGH: 'عالية',
  MEDIUM: 'متوسطة',
  LOW: 'منخفضة',
  'Task options for {title}': 'خيارات المهمة {title}',
  'Edit task: {title}': 'تعديل المهمة: {title}',
  'Delete task: {title}': 'حذف المهمة: {title}',
  'Move to {status}': 'نقل إلى {status}',
  Clear: 'مسح',
  '{{count}} activities': '{{count}} أنشطة',
  Sun: 'الأحد',
  Mon: 'الاثنين',
  Tue: 'الثلاثاء',
  Wed: 'الأربعاء',
  Thu: 'الخميس',
  Fri: 'الجمعة',
  Sat: 'السبت',
  'Assign a task to {name}': 'إسناد مهمة إلى {name}',
  '{{count}} team members': '{{count}} من أعضاء الفريق',
  '{{filtered}} of {{total}} members': '{{filtered}} من أصل {{total}} عضو',
  'Unable to reach the server. Please check your connection.':
    'تعذر الاتصال بالخادم. يُرجى التحقق من اتصالك.',
  'Failed to load tasks.': 'فشل تحميل المهام.',
  'Delete Task': 'حذف المهمة',
  'Are you sure you want to delete "{title}"? This action cannot be undone.':
    'هل أنت متأكد من حذف "{title}"؟ لا يمكن التراجع عن هذا الإجراء.',
};

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'task-manager-language';

  readonly language = signal<AppLanguage>(this.getInitialLanguage());
  readonly direction = computed(() => (this.language() === 'ar' ? 'rtl' : 'ltr'));

  constructor() {
    this.updateDocumentLanguage();
  }

  setLanguage(language: AppLanguage): void {
    this.language.set(language);
    this.document.defaultView?.localStorage.setItem(this.storageKey, language);
    this.updateDocumentLanguage();
  }

  toggleLanguage(): void {
    this.setLanguage(this.language() === 'en' ? 'ar' : 'en');
  }

  translate(key: string, params: Readonly<Record<string, string | number>> = {}): string {
    const text =
      this.language() === 'ar' ? (ARABIC_TRANSLATIONS[key] ?? this.translateDynamicText(key)) : key;
    return text.replace(/\{\{?(\w+)\}?\}/g, (placeholder, name: string) => {
      const value = params[name];
      return value === undefined ? placeholder : String(value);
    });
  }

  private translateDynamicText(text: string): string {
    const serverError = /^Server error (\d+): (.+)$/.exec(text);
    if (serverError) return `خطأ في الخادم ${serverError[1]}: ${serverError[2]}`;

    const relativeTime = /^(\d+)(m|h|d) ago$/.exec(text);
    if (relativeTime) {
      const [, count, unit] = relativeTime;
      const translatedUnit = unit === 'm' ? 'د' : unit === 'h' ? 'س' : 'ي';
      return `منذ ${count}${translatedUnit}`;
    }

    const activityPatterns: readonly [RegExp, string][] = [
      [/^Created task "(.+)"$/, 'تم إنشاء المهمة "$1"'],
      [/^Updated details for "(.+)"$/, 'تم تحديث تفاصيل "$1"'],
      [/^Changed status to (.+) for "(.+)"$/, 'تم تغيير حالة "$2" إلى $1'],
      [/^Assigned "(.+)" to (.+)$/, 'تم إسناد "$1" إلى $2'],
      [/^Deleted task "(.+)"$/, 'تم حذف المهمة "$1"'],
    ];
    for (const [pattern, translation] of activityPatterns) {
      if (pattern.test(text)) return text.replace(pattern, translation);
    }

    const deleteConfirmation =
      /^Are you sure you want to delete "(.+)"\? This action cannot be undone\.$/.exec(text);
    if (deleteConfirmation) {
      return `هل أنت متأكد من حذف "${deleteConfirmation[1]}"؟ لا يمكن التراجع عن هذا الإجراء.`;
    }

    return text;
  }

  private getInitialLanguage(): AppLanguage {
    const stored = this.document.defaultView?.localStorage.getItem(this.storageKey);
    return stored === 'ar' ? 'ar' : 'en';
  }

  private updateDocumentLanguage(): void {
    const root = this.document.documentElement;
    root.lang = this.language();
    root.dir = this.direction();
  }
}
