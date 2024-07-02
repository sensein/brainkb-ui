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
# @File    : serializers.py.py
# @Software: PyCharm


from rest_framework import serializers
from Web.models import KnowledgeBaseViewerModel, QueryEndpoint

class KnowledgeBaseViewerModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeBaseViewerModel
        fields = '__all__'

class QueryEndpointSerializer(serializers.ModelSerializer):
    class Meta:
        model = QueryEndpoint
        fields = '__all__'
