from rest_framework import serializers, viewsets
from .models import Color, Thickness, Product, ProductVariant, ProductStock


class ColorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Color
        fields = '__all__'


class ThicknessSerializer(serializers.ModelSerializer):
    class Meta:
        model = Thickness
        fields = '__all__'


class ProductStockSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductStock
        fields = '__all__'


class ProductVariantSerializer(serializers.ModelSerializer):
    color_details = ColorSerializer(source='color', read_only=True)
    thickness_details = ThicknessSerializer(source='thickness', read_only=True)
    stock = ProductStockSerializer(read_only=True)
    display_name = serializers.CharField(source='__str__', read_only=True)

    class Meta:
        model = ProductVariant
        fields = '__all__'


class ProductSerializer(serializers.ModelSerializer):
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = '__all__'


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().prefetch_related('variants__color', 'variants__thickness', 'variants__stock')
    serializer_class = ProductSerializer
    filterset_fields = ['category', 'is_active']
    search_fields = ['code', 'name']


class ColorViewSet(viewsets.ModelViewSet):
    queryset = Color.objects.all()
    serializer_class = ColorSerializer
    search_fields = ['name', 'code']


class ThicknessViewSet(viewsets.ModelViewSet):
    queryset = Thickness.objects.all()
    serializer_class = ThicknessSerializer
    search_fields = ['name']


class ProductVariantViewSet(viewsets.ModelViewSet):
    queryset = ProductVariant.objects.all().select_related('product', 'color', 'thickness').prefetch_related('stock')
    serializer_class = ProductVariantSerializer
    filterset_fields = ['product', 'color', 'thickness', 'is_active']
    search_fields = ['serial_code', 'specification']


class ProductStockViewSet(viewsets.ModelViewSet):
    queryset = ProductStock.objects.all().select_related('variant__product', 'variant__color', 'variant__thickness')
    serializer_class = ProductStockSerializer
    search_fields = ['variant__serial_code', 'remark']
