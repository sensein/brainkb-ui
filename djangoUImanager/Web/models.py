from django.db import models
from autoslug import AutoSlugField

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
