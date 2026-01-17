from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
# 👇 Импортируем наш новый файл прав
from ..permissions import IsVipOrReadOnly
from ..models import SchoolYear, Quarter
from ..serializers import SchoolYearSerializer, QuarterSerializer

# --- 1. УЧЕБНЫЕ ГОДЫ ---
class SchoolYearViewSet(viewsets.ModelViewSet):
    queryset = SchoolYear.objects.all().order_by('start_date')
    serializer_class = SchoolYearSerializer
    # 🔥 ТЕПЕРЬ ЗАЩИЩЕНО: Создавать годы могут только VIP
    permission_classes = [IsVipOrReadOnly] 

# --- 2. ЧЕТВЕРТИ ---
class QuarterViewSet(viewsets.ModelViewSet):
    queryset = Quarter.objects.all()
    serializer_class = QuarterSerializer
    # 🔥 ТЕПЕРЬ ЗАЩИЩЕНО: Четверти меняют только VIP (админы/гендиректор)
    permission_classes = [IsVipOrReadOnly]

    def perform_create(self, serializer):
        start = serializer.validated_data.get('start_date')
        
        matching_year = SchoolYear.objects.filter(
            start_date__lte=start, 
            end_date__gte=start
        ).first()

        if not matching_year:
            raise ValidationError(
                {"start_date": ["Ошибка! На эту дату не найден Учебный Год. Сначала создайте Год (например, 01.09.2025 - 25.05.2026)."]}
            )

        serializer.save(school_year=matching_year)

    def perform_update(self, serializer):
        start = serializer.validated_data.get('start_date')
        # Если дату меняют, проверяем снова
        if start:
            matching_year = SchoolYear.objects.filter(
                start_date__lte=start, 
                end_date__gte=start
            ).first()
            
            if not matching_year:
                raise ValidationError(
                    {"start_date": ["Дата четверти должна быть внутри дат существующего Учебного Года!"]}
                )
            serializer.save(school_year=matching_year)
        else:
            serializer.save()