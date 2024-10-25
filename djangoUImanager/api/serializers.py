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
from Web.models import KnowledgeBaseViewerModel, QueryEndpoint, UserProfile, Institution, UserInstitution

class KnowledgeBaseViewerModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeBaseViewerModel
        fields = '__all__'

class QueryEndpointSerializer(serializers.ModelSerializer):
    class Meta:
        model = QueryEndpoint
        fields = '__all__'


class InstitutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Institution
        fields = ['id', 'name', 'address', 'website']


class UserInstitutionSerializer(serializers.ModelSerializer):
    institution = InstitutionSerializer()

    class Meta:
        model = UserInstitution
        fields = ['institution', 'position']


class UserProfileSerializer(serializers.ModelSerializer):
    institutions = UserInstitutionSerializer(many=True)

    class Meta:
        model = UserProfile
        fields = ['id', 'user_email', 'full_name', 'profile_pic', 'biography', 'github_id', 'twitter_id',
                  'google_scholar_id', 'linkedin_id', 'research_gate_id', 'orcid_id', 'role', 'institutions']

    def create(self, validated_data):
        institutions_data = validated_data.pop('institutions')
        user = UserProfile.objects.create(**validated_data)

        for institution_data in institutions_data:
            institution_details = institution_data.pop('institution')
            institution, created = Institution.objects.get_or_create(**institution_details)
            UserInstitution.objects.create(
                user=user,
                institution=institution,
                position=institution_data.get('position'),
            )

        return user