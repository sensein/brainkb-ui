from rest_framework.response import Response
from rest_framework.decorators import api_view
from Web.models import KnowledgeBaseViewerModel, QueryEndpoint, UserProfile
from drf_yasg.utils import swagger_auto_schema
from .serializers import QueryEndpointSerializer, KnowledgeBaseViewerModelSerializer, UserProfileSerializer
import json
from rest_framework import status
from drf_yasg import openapi


##############################################################################################
###### Endpoints related to QUERY Endpoint Configuration                                ######
##############################################################################################
@api_view(['GET'])
def get_all_query_endpoints(request):
    query_endpoint = QueryEndpoint.objects.all()
    serializer = QueryEndpointSerializer(query_endpoint, many=True)
    return Response(serializer.data, status=200)


@api_view(['GET'])
def get_query_endpoint(request):

    query_type = request.GET('query_endpoint_type', None)
    service_endpoint_type = request.GET('endpoint_service_type', None)
    if service_endpoint_type is None or query_type is None:
        return Response({"error": "Invalid Data"}, status=400)

    query_endpoint = QueryEndpoint.objects.all().filter(query_endpoint_type=query_type,
                                                        endpoint_service_type=service_endpoint_type,
                                                        status_active=True)

    serializer = QueryEndpointSerializer(query_endpoint, many=True)
    return Response(serializer.data, status=200)


@api_view(['POST'])
def create_query_endpoint(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return Response({'error': 'Invalid JSON'}, status=400)

    query_type = data.get('query_endpoint_type', None)
    endpoint_title = data.get('endpoint_title', None)
    query_url = data.get('query_url', None)
    service_endpoint_type = data.get('endpoint_service_type', None)
    status_active = data.get('status_active', True)


    if service_endpoint_type is None or query_type is None or endpoint_title is None or query_url is None:
        return Response(
            {"error": "Missing required data! endpoint_service_type, query_endpoint_type, endpoint_title and query_url are required"},
            status=400)

    try:
        query_endpoint = QueryEndpoint(
            endpoint_title=endpoint_title,
            query_url=query_url,
            query_endpoint_type=query_type,
            endpoint_service_type=service_endpoint_type,
            status_active=status_active
        )
        query_endpoint.save()
        return Response({"message": "Query Endpoint created successfully"}, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['DELETE'])
def delete_query_endpoint(request, id):
    try:
        query_endpoint = QueryEndpoint.objects.get(id=id)
        query_endpoint.delete()
        return Response({"message": "Query Endpoint deleted successfully"}, status=200)
    except QueryEndpoint.DoesNotExist:
        return Response({"error": "Query Endpoint not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['PUT'])
def update_query_endpoint(request, id):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return Response({'error': 'Invalid JSON'}, status=400)

    query_type = data.get('query_endpoint_type', None)
    endpoint_title = data.get('endpoint_title', None)
    query_url = data.get('query_url', None)
    service_endpoint_type = data.get('endpoint_service_type', None)
    status_active = data.get('status_active', None)

    try:
        query_endpoint = QueryEndpoint.objects.get(id=id)

        if query_type is None:
            query_type = query_endpoint.query_endpoint_type
        if endpoint_title is None:
            endpoint_title = query_endpoint.endpoint_title
        if query_url is None:
            query_url = query_endpoint.query_url
        if service_endpoint_type is None:
            service_endpoint_type = query_endpoint.endpoint_service_type

        # Update the fields with new data
        query_endpoint.query_endpoint_type = query_type
        query_endpoint.endpoint_title = endpoint_title
        query_endpoint.query_url = query_url
        query_endpoint.endpoint_service_type = service_endpoint_type
        query_endpoint.status_active = status_active if status_active is not None else query_endpoint.status_active

        # Save the updated object
        query_endpoint.save()

        return Response({"message": "Query Endpoint updated successfully"}, status=200)
    except QueryEndpoint.DoesNotExist:
        return Response({"error": "Query Endpoint not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


##############################################################################################
###### Endpoints related to Knowledge Base Page Configuration                          ######
##############################################################################################
knowledgebase_properties = {
    'id': openapi.Schema(type=openapi.TYPE_INTEGER, description='ID of the knowledge base'),
    'left_side_menu_title': openapi.Schema(type=openapi.TYPE_STRING, description='Title for the left side menu'),
    'slug': openapi.Schema(type=openapi.TYPE_STRING, description='Slug for the knowledge base'),
    'sparql_query': openapi.Schema(type=openapi.TYPE_STRING, description='SPARQL query string'),
    'default_kb': openapi.Schema(type=openapi.TYPE_BOOLEAN, description='Is this the default knowledge base'),
    'display_column_first': openapi.Schema(type=openapi.TYPE_STRING, description='First display column'),
    'display_column_second': openapi.Schema(type=openapi.TYPE_STRING, description='Second display column'),
    'display_column_third': openapi.Schema(type=openapi.TYPE_STRING, description='Third display column'),
    'display_column_fourth': openapi.Schema(type=openapi.TYPE_STRING, description='Fourth display column'),
    'status_active': openapi.Schema(type=openapi.TYPE_BOOLEAN, description='Is the knowledge base active'),
    'created_at': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_DATETIME,
                                 description='Creation timestamp'),
    'updated_at': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_DATETIME,
                                 description='Last update timestamp'),
}


@swagger_auto_schema(
    method='get',
    operation_description="Retrieve all knowledge bases",
    responses={
        200: openapi.Response(
            description="List of knowledge bases",
            schema=openapi.Schema(
                type=openapi.TYPE_ARRAY,
                items=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties=knowledgebase_properties
                )
            )
        )
    }
)

@api_view(['GET'])
def get_all_knowledgebases(request):
    """
    Retrieve all knowledge bases.

    Returns:
        Response: A list of knowledge bases with detailed information.
    """
    query_endpoint = KnowledgeBaseViewerModel.objects.all()
    serializer = KnowledgeBaseViewerModelSerializer(query_endpoint, many=True)
    return Response(serializer.data, status=200)


@swagger_auto_schema(
    method='get',
    manual_parameters=[
        openapi.Parameter(
            'left_side_menu_title',
            openapi.IN_QUERY,
            description="Title for the left side menu",
            type=openapi.TYPE_STRING,
            required=True
        ),
        openapi.Parameter(
            'display_column_first',
            openapi.IN_QUERY,
            description="First display column",
            type=openapi.TYPE_STRING,
            required=True
        )
    ],
    responses={
        200: openapi.Response(
            description="Success",
            schema=openapi.Schema(
                type=openapi.TYPE_ARRAY,
                items=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties=knowledgebase_properties
                )
            )
        ),
        400: "Invalid input"
    }
)
@api_view(['GET'])
def get_knowledgebase_page(request):
    """
        Retrieve knowledge base entries based on left_side_menu_title and display_column_first.

        ---
        parameters:
          - name: left_side_menu_title
            in: query
            description: Title for the left side menu
            required: true
            type: string
          - name: display_column_first
            in: query
            description: First display column
            required: true
            type: string
        responses:
            200:
                description: Success
                schema:
                    type: array
                    items:
                        type: object
                        properties:
                            id:
                                type: integer
                                description: ID
                            sparql_query:
                                type: string
                                description: SPARQL query string
                            left_side_menu_title:
                                type: string
                                description: Title for the left side menu
                            display_column_first:
                                type: string
                                description: First display column
                            display_column_second:
                                type: string
                                description: Second display column
                            display_column_third:
                                type: string
                                description: Third display column
                            display_column_fourth:
                                type: string
                                description: Fourth display column
                            default_kb:
                                type: boolean
                                description: Whether this is the default knowledge base
                            status_active:
                                type: boolean
                                description: Whether the knowledge base is active
                            created_at:
                                type: datetime
                                description: created date
                            updated_at:
                                type: datetime
                                description: date when the update is made
            400:
                description: Invalid input
        """
    left_side_menu_title = request.GET.get('left_side_menu_title', None)
    display_column_first = request.GET.get('display_column_first', None)

    left_side_menu_title = left_side_menu_title
    display_column_first =  display_column_first
    if left_side_menu_title is None or display_column_first is None:
        return Response({"error": "Invalid Data"}, status=400)

    query_endpoint = KnowledgeBaseViewerModel.objects.all().filter(left_side_menu_title=left_side_menu_title,
                                                                   display_column_first=display_column_first,
                                                                   status_active=True)

    serializer = KnowledgeBaseViewerModelSerializer(query_endpoint, many=True)
    return Response(serializer.data, status=200)


@swagger_auto_schema(
    method='post',
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            'sparql_query': openapi.Schema(type=openapi.TYPE_STRING, description='SPARQL query string'),
            'left_side_menu_title': openapi.Schema(type=openapi.TYPE_STRING,
                                                   description='Title for the left side menu'),
            'display_column_first': openapi.Schema(type=openapi.TYPE_STRING, description='First display column'),
            'display_column_second': openapi.Schema(type=openapi.TYPE_STRING, description='Second display column'),
            'display_column_third': openapi.Schema(type=openapi.TYPE_STRING, description='Third display column'),
            'display_column_fourth': openapi.Schema(type=openapi.TYPE_STRING, description='Fourth display column'),
            'default_kb': openapi.Schema(type=openapi.TYPE_BOOLEAN,
                                         description='Whether this is the default knowledge base', default=False),
            'status_active': openapi.Schema(type=openapi.TYPE_BOOLEAN,
                                            description='Whether the knowledge base is active', default=True),
        },
        required=['sparql_query', 'left_side_menu_title', 'display_column_first'],
    ),
    responses={
        201: 'Query Endpoint created successfully',
        400: 'Invalid input',
        500: 'Server error',
    }
)
@api_view(['POST'])
def create_knowledgebase(request):
    """
        Create a new knowledge base entry.

        ---
        parameters:
          - name: sparql_query
            description: SPARQL query string.
            required: true
            type: string
          - name: left_side_menu_title
            description: Title for the left side menu.
            required: true
            type: string
          - name: display_column_first
            description: First display column.
            required: true
            type: string
          - name: display_column_second
            description: Second display column.
            type: string
          - name: display_column_third
            description: Third display column.
            type: string
          - name: display_column_fourth
            description: Fourth display column.
            type: string
          - name: default_kb
            description: Whether this is the default knowledge base.
            type: boolean
            default: false
          - name: status_active
            description: Whether the knowledge base is active.
            type: boolean
            default: true
        responses:
            201:
                description: Query Endpoint created successfully
            400:
                description: Invalid input
            500:
                description: Server error
        """
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return Response({'error': 'Invalid JSON'}, status=400)

    sparql_query = data.get('sparql_query', None)
    left_side_menu_title = data.get('left_side_menu_title', None)
    display_column_first = data.get('display_column_first', None)
    display_column_second = data.get('display_column_second', "")
    display_column_third = data.get('display_column_third', "")
    display_column_fourth = data.get('display_column_fourth', "")
    default_kb = data.get('default_kb', False)
    status_active = data.get('status_active', True)

    if sparql_query is None or left_side_menu_title is None or display_column_first is None:
        return Response(
            {"error": "Missing required data."},
            status=400)

    try:
        query_endpoint = KnowledgeBaseViewerModel(
            sparql_query=sparql_query,
            left_side_menu_title=left_side_menu_title,
            display_column_first=display_column_first,
            display_column_second=display_column_second,
            display_column_third=display_column_third,
            display_column_fourth=display_column_fourth,
            default_kb=default_kb,
            status_active=status_active
        )
        query_endpoint.save()
        return Response({"message": "Knowledgebase created successfully"}, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@swagger_auto_schema(
    method='put',
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            'sparql_query': openapi.Schema(type=openapi.TYPE_STRING, description='SPARQL query string'),
            'left_side_menu_title': openapi.Schema(type=openapi.TYPE_STRING,
                                                   description='Title for the left side menu'),
            'display_column_first': openapi.Schema(type=openapi.TYPE_STRING, description='First display column'),
            'display_column_second': openapi.Schema(type=openapi.TYPE_STRING, description='Second display column'),
            'display_column_third': openapi.Schema(type=openapi.TYPE_STRING, description='Third display column'),
            'display_column_fourth': openapi.Schema(type=openapi.TYPE_STRING, description='Fourth display column'),
            'default_kb': openapi.Schema(type=openapi.TYPE_BOOLEAN,
                                         description='Whether this is the default knowledge base', default=False),
            'status_active': openapi.Schema(type=openapi.TYPE_BOOLEAN,
                                            description='Whether the knowledge base is active', default=True),
        },
        required=['sparql_query', 'left_side_menu_title', 'display_column_first'],
    ),
    responses={
        200: 'Query Endpoint updated successfully',
        400: 'Invalid input',
        404: 'Not found',
        500: 'Server error',
    }
)
@api_view(['PUT'])
def update_knowledgebase(request, id):
    """
        Update an existing knowledge base entry by ID.

        ---
        parameters:
          - name: id
            description: ID of the knowledge base entry.
            required: true
            type: integer
          - name: sparql_query
            description: SPARQL query string.
            required: true
            type: string
          - name: left_side_menu_title
            description: Title for the left side menu.
            required: true
            type: string
          - name: display_column_first
            description: First display column.
            required: true
            type: string
          - name: display_column_second
            description: Second display column.
            type: string
          - name: display_column_third
            description: Third display column.
            type: string
          - name: display_column_fourth
            description: Fourth display column.
            type: string
          - name: default_kb
            description: Whether this is the default knowledge base.
            type: boolean
            default: false
          - name: status_active
            description: Whether the knowledge base is active.
            type: boolean
            default: true
        responses:
            200:
                description: Query Endpoint updated successfully
            400:
                description: Invalid input
            404:
                description: Not found
            500:
                description: Server error
        """
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return Response({'error': 'Invalid JSON'}, status=400)

    sparql_query = data.get('sparql_query', None)
    left_side_menu_title = data.get('left_side_menu_title', None)
    display_column_first = data.get('display_column_first', None)
    display_column_second = data.get('display_column_second', "")
    display_column_third = data.get('display_column_third', "")
    display_column_fourth = data.get('display_column_fourth', "")
    default_kb = data.get('default_kb', False)
    status_active = data.get('status_active', True)

    try:
        knowledgebasemodel = KnowledgeBaseViewerModel.objects.get(id=id)

        if sparql_query is None:
            sparql_query = knowledgebasemodel.sparql_query
        if left_side_menu_title is None:
            left_side_menu_title = knowledgebasemodel.left_side_menu_title
        if display_column_first is None:
            display_column_first = knowledgebasemodel.display_column_first

        # Update the fields with new data
        knowledgebasemodel.sparql_query = sparql_query
        knowledgebasemodel.left_side_menu_title = left_side_menu_title
        knowledgebasemodel.display_column_first = display_column_first
        knowledgebasemodel.display_column_second = display_column_second
        knowledgebasemodel.display_column_third = display_column_third
        knowledgebasemodel.display_column_fourth = display_column_fourth
        knowledgebasemodel.default_kb = default_kb
        knowledgebasemodel.status_active = status_active if status_active is not None else knowledgebasemodel.status_active

        # Save the updated object
        knowledgebasemodel.save()

        return Response({"message": "Knowledgebase updated successfully"}, status=200)
    except QueryEndpoint.DoesNotExist:
        return Response({"error": "Knowledgebase not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@swagger_auto_schema(
    method='delete',
    manual_parameters=[
        openapi.Parameter('id', openapi.IN_PATH, description="ID of the knowledge base entry",
                          type=openapi.TYPE_INTEGER)
    ],
    responses={
        200: 'Knowledgebase deleted successfully',
        404: 'Knowledgebase not found',
        500: 'Server error',
    }
)
@api_view(['DELETE'])
def delete_knowledgebase(request, id):
    """
        Delete a knowledge base entry by ID.

        ---
        parameters:
          - name: id
            in: path
            description: ID of the knowledge base entry to delete
            required: true
            type: integer
        responses:
            200:
                description: Knowledgebase deleted successfully
            404:
                description: Knowledgebase not found
            500:
                description: Server error
        """
    try:
        query_endpoint = KnowledgeBaseViewerModel.objects.get(id=id)
        query_endpoint.delete()
        return Response({"message": "QKnowledgebase deleted successfully"}, status=200)
    except QueryEndpoint.DoesNotExist:
        return Response({"error": "Knowledgebase not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
def create_user_profile(request):
    serializer = UserProfileSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

##############################################################################################
@api_view(['GET'])
def api_root(request):
    return Response({"message": "API is running!"})
