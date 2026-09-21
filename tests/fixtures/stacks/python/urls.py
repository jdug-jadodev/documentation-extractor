from django.urls import path
urlpatterns = [path("orders/<str:id>", views.order)]
