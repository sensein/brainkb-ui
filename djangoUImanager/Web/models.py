import uuid

from django.db import models
from autoslug import AutoSlugField
from django.utils.html import mark_safe

ENDPOINT_TYPE = (
    ('get', 'GET'),
    ('post', 'POST'),
    ('put', 'PUT'),
    ('delete', 'DELETE')
)

ENDPOINT_SERVICE_TYPE = (
    ('search', 'SEARCH'),
    ('query', 'QUERY'),
)

ROLES_BRAINKB = (
    ('admin', 'ADMIN'),
    ('curator', 'CURATOR'),
    ('reviewer', 'REVIEWER'),

)


class KnowledgeBaseViewerModel(models.Model):
    """This model is used for displaying knowledge base data as well as for setting the menu"""
    left_side_menu_title = models.CharField(max_length=350, blank=False, unique=True, help_text="Left side menu title")
    slug = AutoSlugField(populate_from='left_side_menu_title', unique=False)
    sparql_query = models.TextField(blank=False)
    default_kb = models.BooleanField(blank=False, default=False)
    display_column_first = models.CharField(max_length=150, blank=False,
                                            help_text="The column that will be displayed when the page loads.")
    display_column_second = models.CharField(max_length=150, blank=True,
                                             help_text="The column that will be displayed when the page loads.")
    display_column_third = models.CharField(max_length=150, blank=True,
                                            help_text="The column that will be displayed when the page loads.")
    display_column_fourth = models.CharField(max_length=150, blank=True,
                                             help_text="The column that will be displayed when the page loads.")
    status_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class QueryEndpoint(models.Model):
    endpoint_title = models.CharField(max_length=350, blank=False, unique=True)
    query_url = models.URLField(blank=False, unique=True)
    query_endpoint_type = models.CharField(max_length=20, unique=True, choices=ENDPOINT_TYPE, default='get')
    endpoint_service_type = models.CharField(max_length=20, choices=ENDPOINT_SERVICE_TYPE, default='query')
    status_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class UserProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_email = models.EmailField(blank=False, unique=True)
    full_name = models.CharField(max_length=350)
    profile_pic = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    biography = models.TextField()
    github_id = models.CharField(blank=True, max_length=350)
    twitter_id = models.CharField(blank=True, max_length=350)
    google_scholar_id = models.CharField(blank=True, max_length=350)
    linkedin_id = models.CharField(blank=True, max_length=350)
    research_gate_id = models.CharField(blank=True, max_length=350)
    orcid_id = models.CharField(blank=True, max_length=350)
    role = models.CharField(max_length=30, choices=ROLES_BRAINKB, default='curator')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def picture(self):  # new
        return mark_safe(f'<img src = "{self.profile_pic.url}" width = "100"/>')

class Comment(models.Model):
    user_profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='comments')
    comment_text = models.TextField()
    commented_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Revision(models.Model):
    user_profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='revisions')
    revision_text = models.TextField()
    revised_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Institution(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=350, unique=True)
    address = models.TextField(blank=True)
    website = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class UserInstitution(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE)
    position = models.CharField(max_length=350, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'institution', 'position')

    def __str__(self):
        return f"{self.user.full_name} at {self.institution.name} ({self.position})"