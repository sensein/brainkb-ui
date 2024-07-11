from django.contrib import admin
from .models import KnowledgeBaseViewerModel, QueryEndpoint, UserProfile, UserInstitution, Institution
# Register your models here.

class KnowledgeBaseAdmin(admin.ModelAdmin):
    list_display = ('left_side_menu_title', 'created_at', 'updated_at', 'status_active', 'slug', 'display_column_first',
                    'display_column_second', 'display_column_third', 'display_column_fourth')
    list_filter = ('left_side_menu_title',  'status_active')

class QueryEndpointAdmin(admin.ModelAdmin):
    list_display = ('endpoint_title', 'query_endpoint_type', 'endpoint_service_type', 'created_at', 'status_active')
    list_filter = ('endpoint_title', 'endpoint_service_type', 'query_endpoint_type', 'status_active')


class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user_email', 'full_name', 'role',)
    list_filter = ('user_email', 'full_name', 'role')

class UserInstitutionAdmin(admin.ModelAdmin):
    list_display = ('user', 'institution', 'position')
    list_filter = ('user__full_name', 'institution__name', 'position')

class InstitutionAdmin(admin.ModelAdmin):
    list_display = ('name', 'address', 'website')
    list_filter = ('name', 'address', 'website')

admin.site.register(UserInstitution, UserInstitutionAdmin)
admin.site.register(Institution, InstitutionAdmin)
admin.site.register(UserProfile, UserProfileAdmin)
admin.site.register(QueryEndpoint, QueryEndpointAdmin)
admin.site.register(KnowledgeBaseViewerModel, KnowledgeBaseAdmin)