# backend/gat_exam/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from .models import (
    School, SchoolYear, Quarter, StudentClass, Student, 
    Exam, Question, Choice, Notification, Subject, 
    Topic, GlobalSettings, UserProfile, ExamResult
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


# --- 5. ЭКЗАМЕНЫ (🔥 ИСПРАВЛЕНО) ---
class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 2

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    inlines = [ChoiceInline]
    list_display = ('text_short', 'exam', 'topic', 'difficulty', 'question_type')
    list_filter = ('exam', 'difficulty', 'question_type')
    search_fields = ('text',)

    def text_short(self, obj):
        return obj.text[:50]
    text_short.short_description = "Вопрос"

@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    # 🔥 Здесь мы заменили 'subject' на функцию display_subjects
    list_display = ('title', 'display_subjects', 'school', 'gat_round', 'gat_day', 'status', 'date')
    
    # 🔥 Здесь заменили 'subject' на 'subjects' (для фильтрации по M2M)
    list_filter = ('subjects', 'school', 'status', 'gat_round', 'exam_type')
    
    search_fields = ('title',)
    
    # 🔥 Добавляем удобный виджет для выбора предметов и классов
    filter_horizontal = ('subjects', 'classes')

    # Функция для красивого отображения списка предметов в таблице
    def display_subjects(self, obj):
        return ", ".join([s.name for s in obj.subjects.all()])
    display_subjects.short_description = "Предметы"


# --- 6. ТЕМЫ ---
@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ('title', 'subject', 'grade_level', 'quarter') # Убрал 'school'
    filter_horizontal = ('schools',)


# --- 7. УЧЕНИКИ ---
@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('last_name_ru', 'first_name_ru', 'school', 'student_class', 'status')
    list_filter = ('school', 'status', 'gender')
    search_fields = ('last_name_ru', 'first_name_ru', 'custom_id', 'username')


# --- 8. ОСТАЛЬНОЕ ---
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