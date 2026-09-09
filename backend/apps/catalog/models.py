from django.db import models
from django.utils import timezone


class Color(models.Model):
    name = models.CharField(max_length=50, unique=True)
    code = models.CharField(max_length=20, blank=True, null=True, help_text="Short code or symbol e.g. B, W, -")
    hex_code = models.CharField(max_length=10, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.code})" if self.code else self.name


class Thickness(models.Model):
    name = models.CharField(max_length=50, unique=True, help_text="e.g. 3MM, 10MM, 15MM")
    value_mm = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Product(models.Model):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=150)
    category = models.CharField(max_length=100, default="SHOE_LACE")
    unit = models.CharField(max_length=20, default="KG")
    remark = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.code} - {self.name}"


class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    serial_code = models.CharField(max_length=100, help_text="Excel SERRIAL CODE e.g. 37\\110, 37\\k, 40 cm")
    color = models.ForeignKey(Color, on_delete=models.SET_NULL, null=True, blank=True, related_name="product_variants")
    thickness = models.ForeignKey(Thickness, on_delete=models.SET_NULL, null=True, blank=True, related_name="product_variants")
    specification = models.CharField(max_length=100, blank=True, null=True)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('serial_code', 'color', 'thickness')

    def __str__(self):
        color_str = self.color.code if self.color else "-"
        thick_str = self.thickness.name if self.thickness else "-"
        return f"{self.serial_code} | {color_str} | {thick_str}"


class ProductStock(models.Model):
    variant = models.OneToOneField(ProductVariant, on_delete=models.CASCADE, related_name="stock")
    daily_product = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    in_qty = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    out_qty = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    st_v = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Excel ST V")
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Excel Total / Opening Stock")
    calculated_stock = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Ledger-derived current stock")
    remark = models.CharField(max_length=255, blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Stock for {self.variant}: {self.calculated_stock} KG (Excel Total: {self.total})"
