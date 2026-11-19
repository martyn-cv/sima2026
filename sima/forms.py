from django import forms
from django.conf import settings
from django.contrib.auth import authenticate

from .models import Equipo, Informe, Nota, OrdenTrabajo, Plan, Reporte, Usuario


class LoginForm(forms.Form):
    email = forms.EmailField(label="Correo corporativo",
                             widget=forms.EmailInput(attrs={"placeholder": f"usuario@{settings.DOMINIO_PERMITIDO}"}))
    password = forms.CharField(label="Contraseña", widget=forms.PasswordInput)

    def __init__(self, *args, request=None, **kwargs):
        self.request, self.user = request, None
        super().__init__(*args, **kwargs)

    def clean_email(self):
        email = self.cleaned_data["email"].strip().lower()
        if email.rsplit("@", 1)[-1] != settings.DOMINIO_PERMITIDO:
            raise forms.ValidationError(f"Solo se puede ingresar con un correo @{settings.DOMINIO_PERMITIDO}.")
        return email

    def clean(self):
        data = super().clean()
        if data.get("email") and data.get("password"):
            user = authenticate(self.request, username=data["email"], password=data["password"])
            if user is None or not user.is_active:
                raise forms.ValidationError("Correo o contraseña incorrectos, o el usuario no tiene acceso a SIMA.")
            self.user = user
        return data


class EquipoChoice(forms.ModelChoiceField):
    def label_from_instance(self, obj):
        return f"{obj.nombre_habitual} · {obj.ubicacion}"  # nombre habitual y lugar, no solo el código


class ReporteForm(forms.ModelForm):
    equipo = EquipoChoice(queryset=Equipo.objects.all(), empty_label="Elija la máquina", label="Máquina")

    class Meta:
        model = Reporte
        fields = ["equipo", "descripcion", "foto", "detiene_linea"]
        widgets = {"descripcion": forms.Textarea(attrs={"rows": 4}),
                   "foto": forms.ClearableFileInput(attrs={"accept": "image/*", "capture": "environment"})}


class OTForm(forms.ModelForm):
    equipo = EquipoChoice(queryset=Equipo.objects.all(), empty_label="Elija el equipo")

    class Meta:
        model = OrdenTrabajo
        fields = ["equipo", "titulo", "descripcion", "tipo", "prioridad", "asignado_a"]
        widgets = {"descripcion": forms.Textarea(attrs={"rows": 3})}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["asignado_a"].queryset = Usuario.objects.filter(rol="tecnico")
        self.fields["asignado_a"].empty_label = "Sin asignar"


class BitacoraForm(forms.Form):
    texto = forms.CharField(label="Diagnóstico / acción realizada", widget=forms.Textarea(attrs={"rows": 3}))
    horas = forms.DecimalField(label="Horas trabajadas", min_value=0, max_value=99, decimal_places=2,
                               initial=0, required=False)
    es_traspaso = forms.BooleanField(label="Es nota de traspaso (para el siguiente turno)", required=False)
    uid = forms.CharField(required=False, max_length=40, widget=forms.HiddenInput)
    hecho_en = forms.DateTimeField(required=False, widget=forms.HiddenInput)


class RepuestoOTForm(forms.Form):
    repuesto = forms.ModelChoiceField(queryset=None, label="Repuesto")
    cantidad = forms.IntegerField(min_value=1, initial=1)

    def __init__(self, *args, **kwargs):
        from .models import Repuesto
        super().__init__(*args, **kwargs)
        self.fields["repuesto"].queryset = Repuesto.objects.all()
        self.fields["repuesto"].label_from_instance = lambda r: f"{r.nombre} · {r.bodega} · stock {r.stock}"


class ManualForm(forms.ModelForm):
    class Meta:
        model = Equipo
        fields = ["manual"]


class NotaForm(forms.ModelForm):
    class Meta:
        model = Nota
        fields = ["tipo", "titulo", "equipo", "texto"]
        widgets = {"texto": forms.Textarea(attrs={"rows": 5})}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["equipo"].required = False
        self.fields["equipo"].empty_label = "General (sin equipo)"


class PlanForm(forms.ModelForm):
    class Meta:
        model = Plan
        fields = ["titulo", "tipo", "equipo", "responsable", "fecha_inicio", "fecha_fin", "descripcion"]
        widgets = {"fecha_inicio": forms.DateInput(attrs={"type": "date"}, format="%Y-%m-%d"),
                   "fecha_fin": forms.DateInput(attrs={"type": "date"}, format="%Y-%m-%d"),
                   "descripcion": forms.Textarea(attrs={"rows": 3})}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["equipo"].required = False
        self.fields["responsable"].queryset = Usuario.objects.filter(rol="tecnico")

    def clean(self):
        d = super().clean()
        if d.get("fecha_inicio") and d.get("fecha_fin") and d["fecha_fin"] < d["fecha_inicio"]:
            self.add_error("fecha_fin", "La fecha final no puede ser anterior a la inicial.")
        return d


class InformeForm(forms.ModelForm):
    class Meta:
        model = Informe
        fields = ["titulo", "contenido", "compartido"]
        widgets = {"contenido": forms.Textarea(attrs={"rows": 10})}
