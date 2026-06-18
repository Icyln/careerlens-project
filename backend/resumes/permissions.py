from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        return bool(
            user.is_staff
            or getattr(user, 'role', '') == 'admin'
            or getattr(user, 'is_admin', False)
        )


class IsOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.is_staff or getattr(request.user, 'role', '') == 'admin':
            return True

        owner = getattr(obj, 'owner', None)

        if owner is None and hasattr(obj, 'resume'):
            owner = getattr(obj.resume, 'owner', None)

        return owner == request.user