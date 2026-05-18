from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("email", "password", "name", "role")

    def validate_role(self, value):
        if value == "admin":
            raise serializers.ValidationError("Cannot register as admin.")
        if value not in ("student", "teacher"):
            raise serializers.ValidationError("Role must be student or teacher.")
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "name", "role")

class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    login = serializers.CharField(write_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields.pop(User.USERNAME_FIELD, None)

    def validate(self, attrs):
        login = attrs.pop("login")
        data = super().validate({User.USERNAME_FIELD: login, "password": attrs["password"]})
        data["user"] = UserSerializer(self.user).data
        return data
