# backend/gat_exam/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from .models import (
    School, SchoolYear, Quarter, StudentClass, Student, 
    Exam, Question, Choice, Notification, Subject, 
    Topic, GlobalSettings, UserProfile, ExamResult,
    # Новые модели
    AIPrompt, QuestionLimit, ExamRound, BookletSection, 
    SectionQuestion, MasterBooklet
)

# --- 1. НАСТРОЙКА ПОЛЬЗОВАТЕЛЯ (С ПРОФИЛЕМ) ---
class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Профиль'

# Отменяем старую регистрацию User и регистрируем с инлайном
admin.site.unregister(User)
@admin.register(User)
class CustomUserAdmin(UserAdmin):
    inlines = (UserProfileInline,)
    list_display = ('username', 'email', 'first_name', 'last_name', 'get_role', 'is_staff')
    
    def get_role(self, obj):
        return obj.profile.get_role_display()
    get_role.short_description = 'Роль'


# --- 2. ШКОЛЫ И КЛАССЫ ---
@admin.register(School)
class SchoolAdmin(admin.ModelAdmin):
    list_display = ('name', 'custom_id', 'phone', 'min_grade_level', 'max_grade_level')
    search_fields = ('name', 'custom_id')

@admin.register(StudentClass)
class StudentClassAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'school', 'grade_level', 'section', 'language')
    list_filter = ('school', 'grade_level')
    search_fields = ('school__name',)


# --- 3. АКАДЕМИЧЕСКИЙ ГОД И ЧЕТВЕРТИ ---
@admin.register(SchoolYear)
class SchoolYearAdmin(admin.ModelAdmin):
    list_display = ('name', 'start_date', 'end_date', 'is_active')
    list_editable = ('is_active',)

@admin.register(Quarter)
class QuarterAdmin(admin.ModelAdmin):
    list_display = ('name', 'school_year', 'start_date', 'end_date', 'is_active')
    list_filter = ('school_year',)
    list_editable = ('is_active',)


# --- 4. ПРЕДМЕТЫ ---
@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'abbreviation', 'category', 'is_active')
    list_filter = ('category', 'is_active')
    search_fields = ('name', 'abbreviation')


# --- 5. ЭКЗАМЕНЫ ---
class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 2

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    inlines = [ChoiceInline]
    list_display = ('text_short', 'topic', 'difficulty', 'question_type')
    list_filter = ('topic', 'difficulty', 'question_type')
    search_fields = ('text',)

    def text_short(self, obj):
        return obj.text[:50]
    text_short.short_description = "Вопрос"

@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ('title', 'display_subjects', 'school', 'gat_round', 'gat_day', 'status', 'date')
    list_filter = ('subjects', 'school', 'status', 'gat_round', 'exam_type')
    search_fields = ('title',)
    filter_horizontal = ('subjects', 'classes', 'questions')

    def display_subjects(self, obj):
        return ", ".join([s.name for s in obj.subjects.all()])
    display_subjects.short_description = "Предметы"


# --- 6. ТЕМЫ ---
@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ('title', 'subject', 'grade_level', 'quarter')
    filter_horizontal = ('schools',)


# --- 7. УЧЕНИКИ ---
@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('last_name_ru', 'first_name_ru', 'school', 'student_class', 'username', 'status')
    list_filter = ('school', 'status', 'gender')
    search_fields = ('last_name_ru', 'first_name_ru', 'custom_id', 'username')
    list_editable = ('status',)


# --- 8. ОСТАЛЬНОЕ (Уведомления, Настройки, Результаты) ---
@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'type', 'is_read', 'created_at')
    list_filter = ('type', 'is_read')

@admin.register(GlobalSettings)
class GlobalSettingsAdmin(admin.ModelAdmin):
    list_display = ('site_name', 'current_year', 'maintenance_mode')

@admin.register(ExamResult)
class ExamResultAdmin(admin.ModelAdmin):
    list_display = ('student', 'exam', 'score', 'percentage')
    list_filter = ('exam',)


# --- 9. 🔥 ЛИМИТЫ ВОПРОСОВ (QuestionCounts) ---
@admin.register(QuestionLimit)
class QuestionLimitAdmin(admin.ModelAdmin):
    list_display = ('school', 'grade_level', 'subject', 'count')
    list_filter = ('school', 'grade_level', 'subject')
    list_editable = ('count',)


# --- 10. 🔥 SMART BOOKLET (Раунды и Секции) ---
@admin.register(ExamRound)
class ExamRoundAdmin(admin.ModelAdmin):
    list_display = ('name', 'date', 'is_active', 'target_easy_pct', 'target_medium_pct', 'target_hard_pct')
    list_editable = ('is_active', 'date')

class SectionQuestionInline(admin.TabularInline):
    model = SectionQuestion
    extra = 1
    raw_id_fields = ('question',) # Чтобы админка не висла, если вопросов тысячи

@admin.register(BookletSection)
class BookletSectionAdmin(admin.ModelAdmin):
    list_display = ('subject', 'round', 'grade_level', 'day', 'status', 'expert')
    list_filter = ('round', 'subject', 'status', 'grade_level')
    inlines = [SectionQuestionInline]

@admin.register(MasterBooklet)
class MasterBookletAdmin(admin.ModelAdmin):
    list_display = ('round', 'is_generated', 'generated_at')


# --- 11. 🧠 AI PROMPTS (МОЗГ СИСТЕМЫ) ---
@admin.register(AIPrompt)
class AIPromptAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'model_name', 'temperature', 'updated_at', 'is_active')
    list_editable = ('model_name', 'temperature', 'is_active')
    search_fields = ('name', 'slug')
    readonly_fields = ('slug',) # Slug зашит в код, его лучше не менять руками
    
    fieldsets = (
        ("Системная информация", {
            "fields": ("name", "slug", "is_active")
        }),
        ("Настройки Нейросети", {
            "fields": ("model_name", "temperature"),
            "description": "Temperature: 0 - робот (строго), 1 - художник (креативно)."
        }),
        ("Инструкции (Prompts)", {
            "fields": ("system_role", "user_template"),
            "description": "Используйте {text}, {choices} и другие переменные в шаблоне User."
        }),
    )