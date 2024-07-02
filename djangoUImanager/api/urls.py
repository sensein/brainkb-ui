# -*- coding: utf-8 -*-
# -----------------------------------------------------------------------------
# DISCLAIMER: This software is provided "as is" without any warranty,
# express or implied, including but not limited to the warranties of
# merchantability, fitness for a particular purpose, and non-infringement.
#
# In no event shall the authors or copyright holders be liable for any
# claim, damages, or other liability, whether in an action of contract,
# tort, or otherwise, arising from, out of, or in connection with the
# software or the use or other dealings in the software.
# -----------------------------------------------------------------------------

# @Author  : Tek Raj Chhetri
# @Email   : tekraj@mit.edu
# @Web     : https://tekrajchhetri.com/
# @File    : urls.py
# @Software: PyCharm


from django.urls import path, include
from . import views


urlpatterns = [
    path('update-knowledgebase/<int:id>', views.update_knowledgebase, name='update_knowledgebase'),
    path('get-all-knowledgebases', views.get_all_knowledgebases, name='get_all_knowledgebases'),
    path('get-knowledgebase', views.get_knowledgebase_page, name='get_knowledgebase_page'),
    path('create-knowledgebase', views.create_knowledgebase, name='create_knowledgebase'),
    path('delete-knowledgebase/<int:id>', views.delete_knowledgebase, name='delete_knowledgebase'),

    path('update-query-endpoint/<int:id>', views.update_query_endpoint, name='update_query_endpoint'),
    path('get-all-query-endpoints', views.get_all_query_endpoints, name='get_all_query_endpoints'),
    path('get-query-endpoint', views.get_query_endpoint, name='get_query_endpoint'),
    path('create-query-endpoint', views.create_query_endpoint, name='create_query_endpoint'),
    path('delete-query-endpoint/<int:id>', views.delete_query_endpoint, name='delete_query_endpoint'),

    path('', views.api_root, name='api_root'),
]
