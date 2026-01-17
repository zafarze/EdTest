import django_filters
from .models import Student, Topic

# 🔥 ГЛАВНАЯ МАГИЯ: Фильтр, который понимает запятые (например, ?subject=1,2,3)
class NumberInFilter(django_filters.BaseInFilter, django_filters.NumberFilter):
    pass

# --- ФИЛЬТР ДЛЯ УЧЕНИКОВ ---
class StudentFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method='filter_search')
    school_id = django_filters.NumberFilter(field_name='school__id')
    class_id = django_filters.NumberFilter(field_name='student_class__id')
    grade_level = django_filters.NumberFilter(field_name='student_class__grade_level')

    class Meta:
        model = Student
        fields = ['status', 'gender', 'school_id', 'class_id', 'grade_level']

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            django_filters.filters.Q(last_name__icontains=value) |
            django_filters.filters.Q(first_name__icontains=value) |
            django_filters.filters.Q(username__icontains=value) |
            django_filters.filters.Q(custom_id__icontains=value)
        )

# --- 🔥 НОВЫЙ ФИЛЬТР ДЛЯ ТЕМ (TOPICS) ---
class TopicFilter(django_filters.FilterSet):
    # 1. Школы (можно выбрать несколько)
    schools = NumberInFilter(field_name='schools__id', lookup_expr='in')
    
    # 2. Предметы (можно выбрать несколько)
    subject = NumberInFilter(field_name='subject__id', lookup_expr='in')
    
    # 3. 🔥 Четверти (ТЕПЕРЬ ТОЖЕ МОЖНО ВЫБРАТЬ НЕСКОЛЬКО: ?quarter=1,2)
    quarter = NumberInFilter(field_name='quarter', lookup_expr='in')
    
    # 4. Класс (обычный фильтр, один класс за раз)
    grade_level = django_filters.NumberFilter()

    class Meta:
        model = Topic
        fields = ['schools', 'grade_level', 'subject', 'quarter']